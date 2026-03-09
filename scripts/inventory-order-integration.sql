-- Step 2: Order Management Integration for Inventory System
-- This script integrates inventory management with the existing order system
-- Run this after populate-original-toy-id.sql

-- ========================================
-- ORDER-INVENTORY INTEGRATION FUNCTIONS
-- ========================================

-- Function to reserve inventory when order is created
CREATE OR REPLACE FUNCTION reserve_toy_inventory(
    p_toy_id UUID,
    p_quantity INTEGER,
    p_order_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    current_available INTEGER;
BEGIN
    -- Get current available quantity
    SELECT available_quantity INTO current_available
    FROM toys 
    WHERE id = p_toy_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Toy with ID % not found', p_toy_id;
    END IF;
    
    -- Check if sufficient inventory available
    IF current_available < p_quantity THEN
        RAISE EXCEPTION 'Insufficient inventory for toy %. Available: %, Requested: %', 
            p_toy_id, current_available, p_quantity;
    END IF;
    
    -- Reserve inventory by reducing available quantity
    UPDATE toys 
    SET available_quantity = available_quantity - p_quantity,
        updated_at = now()
    WHERE id = p_toy_id;
    
    -- Log the reservation (optional - for audit trail)
    INSERT INTO inventory_transactions (
        toy_id,
        order_id,
        transaction_type,
        quantity_change,
        previous_available,
        new_available,
        created_at
    ) VALUES (
        p_toy_id,
        p_order_id,
        'reserve',
        -p_quantity,
        current_available,
        current_available - p_quantity,
        now()
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to release inventory when order is cancelled
CREATE OR REPLACE FUNCTION release_toy_inventory(
    p_toy_id UUID,
    p_quantity INTEGER,
    p_order_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    current_available INTEGER;
BEGIN
    -- Get current available quantity
    SELECT available_quantity INTO current_available
    FROM toys 
    WHERE id = p_toy_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Toy with ID % not found', p_toy_id;
    END IF;
    
    -- Release inventory by increasing available quantity
    UPDATE toys 
    SET available_quantity = available_quantity + p_quantity,
        updated_at = now()
    WHERE id = p_toy_id;
    
    -- Log the release
    INSERT INTO inventory_transactions (
        toy_id,
        order_id,
        transaction_type,
        quantity_change,
        previous_available,
        new_available,
        created_at
    ) VALUES (
        p_toy_id,
        p_order_id,
        'release',
        p_quantity,
        current_available,
        current_available + p_quantity,
        now()
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to process order inventory changes
CREATE OR REPLACE FUNCTION process_order_inventory(
    p_order_id UUID,
    p_action TEXT -- 'reserve', 'confirm', 'cancel', 'return'
)
RETURNS BOOLEAN AS $$
DECLARE
    order_item RECORD;
    toy_id UUID;
BEGIN
    -- Process each item in the order
    FOR order_item IN 
        SELECT oi.toy_id, oi.quantity, oi.id as order_item_id
        FROM order_items oi
        WHERE oi.order_id = p_order_id
    LOOP
        -- Get the actual toy_id (handle both direct toy_id and ride_on_toy_id)
        toy_id := COALESCE(order_item.toy_id, 
                          (SELECT ride_on_toy_id FROM order_items WHERE id = order_item.order_item_id));
        
        IF toy_id IS NULL THEN
            CONTINUE; -- Skip items without toy_id
        END IF;
        
        -- Apply inventory action
        CASE p_action
            WHEN 'reserve' THEN
                PERFORM reserve_toy_inventory(toy_id, order_item.quantity, p_order_id);
            WHEN 'cancel' THEN
                PERFORM release_toy_inventory(toy_id, order_item.quantity, p_order_id);
            WHEN 'return' THEN
                PERFORM release_toy_inventory(toy_id, order_item.quantity, p_order_id);
            WHEN 'confirm' THEN
                -- For confirmed orders, inventory is already reserved, no additional action needed
                NULL;
            ELSE
                RAISE EXCEPTION 'Invalid action: %. Use reserve, confirm, cancel, or return', p_action;
        END CASE;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- CREATE INVENTORY TRANSACTIONS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    toy_id UUID NOT NULL REFERENCES toys(id),
    order_id UUID REFERENCES orders(id),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('reserve', 'release', 'adjust')),
    quantity_change INTEGER NOT NULL,
    previous_available INTEGER NOT NULL,
    new_available INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID -- Reference to admin user if manual adjustment
);

-- Add RLS policy for inventory transactions
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory transactions are readable by authenticated users" 
    ON inventory_transactions FOR SELECT 
    USING (auth.role() = 'authenticated');

-- ========================================
-- CREATE TRIGGERS FOR AUTOMATIC INVENTORY MANAGEMENT
-- ========================================

-- Trigger function for order status changes
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle order status transitions
    IF TG_OP = 'INSERT' THEN
        -- New order created - reserve inventory
        IF NEW.status IN ('pending', 'confirmed') THEN
            PERFORM process_order_inventory(NEW.id, 'reserve');
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Order status changed
        IF OLD.status != NEW.status THEN
            CASE NEW.status
                WHEN 'cancelled' THEN
                    -- Release reserved inventory
                    PERFORM process_order_inventory(NEW.id, 'cancel');
                WHEN 'delivered' THEN
                    -- Confirm inventory allocation (already reserved)
                    PERFORM process_order_inventory(NEW.id, 'confirm');
                WHEN 'returned' THEN
                    -- Return inventory to available pool
                    PERFORM process_order_inventory(NEW.id, 'return');
                ELSE
                    -- No inventory action needed for other status changes
                    NULL;
            END CASE;
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (but make it optional for now to avoid breaking existing functionality)
-- Uncomment the following lines when ready to enable automatic inventory management:

-- DROP TRIGGER IF EXISTS trigger_order_inventory_management ON orders;
-- CREATE TRIGGER trigger_order_inventory_management
--     AFTER INSERT OR UPDATE ON orders
--     FOR EACH ROW
--     EXECUTE FUNCTION handle_order_status_change();

-- ========================================
-- INVENTORY REPORTING FUNCTIONS
-- ========================================

-- Get current inventory status for a specific toy
CREATE OR REPLACE FUNCTION get_toy_inventory_status(p_toy_id UUID)
RETURNS TABLE (
    toy_id UUID,
    toy_name TEXT,
    total_quantity INTEGER,
    available_quantity INTEGER,
    reserved_quantity INTEGER,
    rented_quantity INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.total_quantity,
        t.available_quantity,
        -- Calculate reserved (pending orders)
        COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE (oi.toy_id = t.id OR oi.ride_on_toy_id = t.id)
            AND o.status IN ('pending', 'confirmed')
        ), 0)::INTEGER as reserved_quantity,
        -- Calculate currently rented (delivered but not returned)
        COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE (oi.toy_id = t.id OR oi.ride_on_toy_id = t.id)
            AND o.status = 'delivered'
        ), 0)::INTEGER as rented_quantity,
        t.updated_at
    FROM toys t
    WHERE t.id = p_toy_id;
END;
$$ LANGUAGE plpgsql;

-- Get inventory summary across all toys
CREATE OR REPLACE FUNCTION get_inventory_summary()
RETURNS TABLE (
    total_toys BIGINT,
    total_inventory BIGINT,
    total_available BIGINT,
    total_reserved BIGINT,
    total_rented BIGINT,
    low_stock_toys BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_toys,
        SUM(t.total_quantity) as total_inventory,
        SUM(t.available_quantity) as total_available,
        -- Calculate total reserved
        COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status IN ('pending', 'confirmed')
        ), 0) as total_reserved,
        -- Calculate total rented
        COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status = 'delivered'
        ), 0) as total_rented,
        -- Count low stock toys (available_quantity <= 2)
        COUNT(*) FILTER (WHERE t.available_quantity <= 2) as low_stock_toys
    FROM toys t;
END;
$$ LANGUAGE plpgsql;

-- Get toys with low inventory
CREATE OR REPLACE FUNCTION get_low_stock_toys(p_threshold INTEGER DEFAULT 2)
RETURNS TABLE (
    toy_id UUID,
    toy_name TEXT,
    category TEXT,
    available_quantity INTEGER,
    total_quantity INTEGER,
    reserved_quantity BIGINT,
    age_range TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.category::TEXT,
        t.available_quantity,
        t.total_quantity,
        COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE (oi.toy_id = t.id OR oi.ride_on_toy_id = t.id)
            AND o.status IN ('pending', 'confirmed')
        ), 0) as reserved_quantity,
        t.age_range
    FROM toys t
    WHERE t.available_quantity <= p_threshold
    ORDER BY t.available_quantity ASC, t.name ASC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_toy_id ON inventory_transactions(toy_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_order_id ON inventory_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_toy_lookup ON order_items(toy_id, order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_ride_on_lookup ON order_items(ride_on_toy_id, order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ========================================
-- DOCUMENTATION
-- ========================================

COMMENT ON FUNCTION reserve_toy_inventory IS 'Reserve inventory when order is created';
COMMENT ON FUNCTION release_toy_inventory IS 'Release inventory when order is cancelled or returned';
COMMENT ON FUNCTION process_order_inventory IS 'Process inventory changes for all items in an order';
COMMENT ON FUNCTION get_toy_inventory_status IS 'Get detailed inventory status for a specific toy';
COMMENT ON FUNCTION get_inventory_summary IS 'Get overall inventory summary statistics';
COMMENT ON FUNCTION get_low_stock_toys IS 'Get toys with low inventory levels';
COMMENT ON TABLE inventory_transactions IS 'Audit trail for all inventory changes';

-- Final verification
SELECT 'Order-Inventory Integration Setup Complete!' as status;

-- Test the integration (optional - run these to verify)
-- SELECT * FROM get_inventory_summary();
-- SELECT * FROM get_low_stock_toys(3);
-- SELECT * FROM get_age_table_inventory_summary(); 