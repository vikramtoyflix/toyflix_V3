-- Dispatch & Order Tracking System
-- Run this in Supabase SQL Editor to create the dispatch tracking tables

-- ========================================
-- CREATE DISPATCH TRACKING TABLES
-- ========================================

-- Main dispatch orders table
CREATE TABLE IF NOT EXISTS dispatch_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL, -- Reference to existing orders table
    customer_id UUID NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    subscription_plan TEXT NOT NULL,
    dispatch_status TEXT NOT NULL DEFAULT 'pending' CHECK (dispatch_status IN ('pending', 'packed', 'dispatched', 'in_transit', 'delivered', 'return_requested', 'returned', 'completed')),
    dispatch_date TIMESTAMP WITH TIME ZONE,
    expected_return_date TIMESTAMP WITH TIME ZONE,
    actual_return_date TIMESTAMP WITH TIME ZONE,
    tracking_number TEXT,
    dispatch_notes TEXT,
    return_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Individual toy dispatch tracking
CREATE TABLE IF NOT EXISTS dispatch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_order_id UUID NOT NULL REFERENCES dispatch_orders(id) ON DELETE CASCADE,
    toy_id UUID NOT NULL, -- Reference to main toys table
    toy_name TEXT NOT NULL,
    toy_category TEXT,
    toy_age_range TEXT,
    quantity_dispatched INTEGER NOT NULL DEFAULT 1,
    item_condition_out TEXT DEFAULT 'good' CHECK (item_condition_out IN ('excellent', 'good', 'fair', 'damaged')),
    item_condition_in TEXT CHECK (item_condition_in IN ('excellent', 'good', 'fair', 'damaged', 'missing')),
    item_status TEXT NOT NULL DEFAULT 'dispatched' CHECK (item_status IN ('dispatched', 'with_customer', 'returned', 'damaged', 'lost')),
    dispatch_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    return_date TIMESTAMP WITH TIME ZONE,
    damage_notes TEXT,
    replacement_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Return tracking and processing
CREATE TABLE IF NOT EXISTS return_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_order_id UUID NOT NULL REFERENCES dispatch_orders(id) ON DELETE CASCADE,
    return_initiated_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    return_method TEXT CHECK (return_method IN ('pickup', 'courier', 'drop_off')),
    return_tracking_number TEXT,
    items_expected INTEGER NOT NULL,
    items_received INTEGER DEFAULT 0,
    items_damaged INTEGER DEFAULT 0,
    items_missing INTEGER DEFAULT 0,
    return_status TEXT NOT NULL DEFAULT 'pending' CHECK (return_status IN ('pending', 'partial', 'complete', 'damaged', 'missing_items')),
    quality_check_done BOOLEAN DEFAULT false,
    quality_check_notes TEXT,
    processing_complete BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_dispatch_orders_status ON dispatch_orders(dispatch_status);
CREATE INDEX IF NOT EXISTS idx_dispatch_orders_customer ON dispatch_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_orders_dates ON dispatch_orders(dispatch_date, expected_return_date);
CREATE INDEX IF NOT EXISTS idx_dispatch_items_toy ON dispatch_items(toy_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_items_status ON dispatch_items(item_status);
CREATE INDEX IF NOT EXISTS idx_return_tracking_status ON return_tracking(return_status);

-- ========================================
-- CREATE DISPATCH MANAGEMENT FUNCTIONS
-- ========================================

-- Function to create a new dispatch order from existing order
CREATE OR REPLACE FUNCTION create_dispatch_order(
    p_order_id UUID,
    p_customer_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_address TEXT,
    p_subscription_plan TEXT,
    p_expected_return_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    v_dispatch_id UUID;
    v_expected_return_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate expected return date
    v_expected_return_date := now() + (p_expected_return_days || ' days')::INTERVAL;
    
    -- Create dispatch order
    INSERT INTO dispatch_orders (
        order_id,
        customer_id,
        customer_name,
        customer_phone,
        customer_address,
        subscription_plan,
        expected_return_date,
        dispatch_status
    ) VALUES (
        p_order_id,
        p_customer_id,
        p_customer_name,
        p_customer_phone,
        p_customer_address,
        p_subscription_plan,
        v_expected_return_date,
        'pending'
    ) RETURNING id INTO v_dispatch_id;
    
    RETURN v_dispatch_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add toys to dispatch order
CREATE OR REPLACE FUNCTION add_toys_to_dispatch(
    p_dispatch_order_id UUID,
    p_toys JSONB -- Array of {toy_id, toy_name, category, age_range, quantity}
)
RETURNS BOOLEAN AS $$
DECLARE
    v_toy JSONB;
BEGIN
    -- Loop through toys and add to dispatch_items
    FOR v_toy IN SELECT * FROM jsonb_array_elements(p_toys)
    LOOP
        INSERT INTO dispatch_items (
            dispatch_order_id,
            toy_id,
            toy_name,
            toy_category,
            toy_age_range,
            quantity_dispatched
        ) VALUES (
            p_dispatch_order_id,
            (v_toy->>'toy_id')::UUID,
            v_toy->>'toy_name',
            v_toy->>'toy_category',
            v_toy->>'toy_age_range',
            COALESCE((v_toy->>'quantity')::INTEGER, 1)
        );
        
        -- Update inventory (reduce available quantity)
        UPDATE toys 
        SET available_quantity = available_quantity - COALESCE((v_toy->>'quantity')::INTEGER, 1),
            updated_at = now()
        WHERE id = (v_toy->>'toy_id')::UUID;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to mark order as dispatched
CREATE OR REPLACE FUNCTION mark_order_dispatched(
    p_dispatch_order_id UUID,
    p_tracking_number TEXT DEFAULT NULL,
    p_dispatch_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE dispatch_orders 
    SET dispatch_status = 'dispatched',
        dispatch_date = now(),
        tracking_number = p_tracking_number,
        dispatch_notes = p_dispatch_notes,
        updated_at = now()
    WHERE id = p_dispatch_order_id;
    
    -- Update all items in this order to 'with_customer'
    UPDATE dispatch_items 
    SET item_status = 'with_customer',
        dispatch_date = now(),
        updated_at = now()
    WHERE dispatch_order_id = p_dispatch_order_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to process returns
CREATE OR REPLACE FUNCTION process_return(
    p_dispatch_order_id UUID,
    p_returned_items JSONB, -- Array of {item_id, condition, damage_notes}
    p_return_method TEXT DEFAULT 'pickup'
)
RETURNS UUID AS $$
DECLARE
    v_return_id UUID;
    v_item JSONB;
    v_items_expected INTEGER;
BEGIN
    -- Get expected items count
    SELECT COUNT(*) INTO v_items_expected
    FROM dispatch_items 
    WHERE dispatch_order_id = p_dispatch_order_id;
    
    -- Create or update return tracking
    INSERT INTO return_tracking (
        dispatch_order_id,
        return_method,
        items_expected,
        items_received
    ) VALUES (
        p_dispatch_order_id,
        p_return_method,
        v_items_expected,
        jsonb_array_length(p_returned_items)
    ) 
    ON CONFLICT (dispatch_order_id) 
    DO UPDATE SET 
        items_received = jsonb_array_length(p_returned_items),
        updated_at = now()
    RETURNING id INTO v_return_id;
    
    -- Process each returned item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_returned_items)
    LOOP
        UPDATE dispatch_items 
        SET item_status = 'returned',
            item_condition_in = v_item->>'condition',
            damage_notes = v_item->>'damage_notes',
            return_date = now(),
            updated_at = now()
        WHERE id = (v_item->>'item_id')::UUID;
        
        -- Return inventory (increase available quantity) if item is in good condition
        IF (v_item->>'condition') IN ('excellent', 'good') THEN
            UPDATE toys 
            SET available_quantity = available_quantity + 1,
                updated_at = now()
            WHERE id = (
                SELECT toy_id FROM dispatch_items 
                WHERE id = (v_item->>'item_id')::UUID
            );
        END IF;
    END LOOP;
    
    -- Update dispatch order status
    UPDATE dispatch_orders 
    SET dispatch_status = 'returned',
        actual_return_date = now(),
        updated_at = now()
    WHERE id = p_dispatch_order_id;
    
    RETURN v_return_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- CREATE REPORTING VIEWS
-- ========================================

-- View for pending dispatches
CREATE OR REPLACE VIEW pending_dispatches AS
SELECT 
    do.id,
    do.order_id,
    do.customer_name,
    do.customer_phone,
    do.subscription_plan,
    do.created_at,
    COUNT(di.id) as total_items,
    STRING_AGG(di.toy_name, ', ') as toys_list
FROM dispatch_orders do
LEFT JOIN dispatch_items di ON do.id = di.dispatch_order_id
WHERE do.dispatch_status = 'pending'
GROUP BY do.id, do.order_id, do.customer_name, do.customer_phone, do.subscription_plan, do.created_at
ORDER BY do.created_at;

-- View for overdue returns
CREATE OR REPLACE VIEW overdue_returns AS
SELECT 
    do.id,
    do.customer_name,
    do.customer_phone,
    do.dispatch_date,
    do.expected_return_date,
    (now() - do.expected_return_date) as overdue_by,
    COUNT(di.id) as total_items,
    STRING_AGG(di.toy_name, ', ') as toys_list
FROM dispatch_orders do
LEFT JOIN dispatch_items di ON do.id = di.dispatch_order_id
WHERE do.dispatch_status IN ('dispatched', 'delivered') 
AND do.expected_return_date < now()
GROUP BY do.id, do.customer_name, do.customer_phone, do.dispatch_date, do.expected_return_date
ORDER BY do.expected_return_date;

-- View for dispatch summary
CREATE OR REPLACE VIEW dispatch_summary AS
SELECT 
    dispatch_status,
    COUNT(*) as order_count,
    SUM(CASE WHEN expected_return_date < now() AND dispatch_status IN ('dispatched', 'delivered') THEN 1 ELSE 0 END) as overdue_count
FROM dispatch_orders
GROUP BY dispatch_status;

-- ========================================
-- DOCUMENTATION
-- ========================================

COMMENT ON TABLE dispatch_orders IS 'Main table for tracking order dispatch and returns';
COMMENT ON TABLE dispatch_items IS 'Individual toy items within each dispatch order';
COMMENT ON TABLE return_tracking IS 'Detailed tracking of return process and quality checks';

COMMENT ON FUNCTION create_dispatch_order IS 'Creates a new dispatch order from existing order data';
COMMENT ON FUNCTION add_toys_to_dispatch IS 'Adds toys to a dispatch order and updates inventory';
COMMENT ON FUNCTION mark_order_dispatched IS 'Marks order as dispatched with tracking info';
COMMENT ON FUNCTION process_return IS 'Processes returned items and updates inventory';

SELECT 'Dispatch Tracking System Setup Complete!' as status; 