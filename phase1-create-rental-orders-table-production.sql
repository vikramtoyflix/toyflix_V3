-- =====================================================
-- PHASE 1: CREATE UNIFIED RENTAL ORDERS TABLE (PRODUCTION)
-- =====================================================
-- This table will serve as the single source of truth for:
-- 1. Migrated orders from existing orders + order_items tables
-- 2. All new orders going forward
-- 3. 24-day cycle management
-- 4. User dashboard data
-- =====================================================

-- Create the unified rental orders table
CREATE TABLE rental_orders (
    -- =====================================================
    -- PRIMARY IDENTIFICATION
    -- =====================================================
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL DEFAULT ('ORD-' || EXTRACT(EPOCH FROM NOW())::bigint || '-' || LEFT(gen_random_uuid()::text, 8)),
    
    -- =====================================================
    -- USER RELATIONSHIP
    -- =====================================================
    user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
    
    -- =====================================================
    -- LEGACY DATA MIGRATION
    -- =====================================================
    legacy_order_id UUID, -- Reference to original orders.id for migration tracking
    legacy_created_at TIMESTAMP, -- Original creation timestamp from old system
    migrated_at TIMESTAMP DEFAULT NOW(), -- When this record was migrated
    
    -- =====================================================
    -- ORDER BASIC INFORMATION
    -- =====================================================
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Status values: pending, confirmed, processing, shipped, delivered, returned, cancelled, refunded
    
    order_type VARCHAR(20) NOT NULL DEFAULT 'subscription',
    -- Order types: subscription, one_time, trial, gift
    
    subscription_plan VARCHAR(50),
    -- Plan types: basic, premium, trial, etc.
    
    -- =====================================================
    -- FINANCIAL INFORMATION
    -- =====================================================
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    base_amount DECIMAL(10,2) DEFAULT 0.00,
    gst_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    
    -- Payment tracking
    payment_status VARCHAR(20) DEFAULT 'pending',
    -- Payment status: pending, paid, failed, refunded, partial
    payment_method VARCHAR(50),
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    
    -- =====================================================
    -- CYCLE MANAGEMENT (24-DAY LOGIC)
    -- =====================================================
    cycle_number INTEGER NOT NULL DEFAULT 1,
    -- Sequential cycle number for this user (1, 2, 3, ...)
    
    rental_start_date DATE NOT NULL,
    rental_end_date DATE NOT NULL,
    -- 30-day rental period
    
    -- =====================================================
    -- DELIVERY & RETURN TRACKING
    -- =====================================================
    delivery_date DATE,
    returned_date DATE,
    
    -- Return status tracking
    return_status VARCHAR(20) DEFAULT 'pending',
    -- Return status: pending, partial, complete, overdue
    
    -- =====================================================
    -- TOYS INFORMATION (JSONB for flexibility)
    -- =====================================================
    toys_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Structure: [{"toy_id": "uuid", "name": "toy name", "category": "category", "quantity": 1, "image_url": "url", "returned": false}]
    
    toys_delivered_count INTEGER DEFAULT 0,
    toys_returned_count INTEGER DEFAULT 0,
    
    -- =====================================================
    -- ADDRESS & LOGISTICS
    -- =====================================================
    shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Structure: {"first_name": "", "last_name": "", "phone": "", "email": "", "address_line1": "", "address_line2": "", "city": "", "state": "", "postcode": "", "country": "IN"}
    
    delivery_instructions TEXT,
    pickup_instructions TEXT,
    
    -- =====================================================
    -- NEXT CYCLE PREPARATION
    -- =====================================================
    next_cycle_address JSONB DEFAULT '{}'::jsonb,
    -- Address for next cycle (if different from current)
    
    next_cycle_toys_selected JSONB DEFAULT '[]'::jsonb,
    -- Toys selected for next cycle during selection window
    
    next_cycle_prepared BOOLEAN DEFAULT false,
    -- Flag to indicate if next cycle is ready
    
    -- =====================================================
    -- SUBSCRIPTION TRACKING
    -- =====================================================
    subscription_id UUID REFERENCES subscriptions(id),
    -- Link to subscription table if needed
    
    age_group VARCHAR(20),
    -- Age group for toy selection: 1-2, 2-3, 3-4, 4-6, 6-8
    
    subscription_category VARCHAR(50),
    -- Category: standard, premium, books, etc.
    
    -- =====================================================
    -- QUALITY & FEEDBACK
    -- =====================================================
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    feedback TEXT,
    damage_reported BOOLEAN DEFAULT false,
    damage_details JSONB DEFAULT '{}'::jsonb,
    
    -- =====================================================
    -- ADMIN & OPERATIONAL
    -- =====================================================
    admin_notes TEXT,
    internal_status VARCHAR(50),
    -- Internal status for admin tracking
    
    dispatch_tracking_number VARCHAR(100),
    return_tracking_number VARCHAR(100),
    
    -- =====================================================
    -- AUDIT TRAIL
    -- =====================================================
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES custom_users(id),
    updated_by UUID REFERENCES custom_users(id),
    
    -- =====================================================
    -- CONSTRAINTS
    -- =====================================================
    CONSTRAINT valid_rental_period CHECK (rental_end_date > rental_start_date),
    CONSTRAINT valid_cycle_number CHECK (cycle_number > 0),
    CONSTRAINT valid_amounts CHECK (total_amount >= 0 AND base_amount >= 0),
    CONSTRAINT valid_toy_counts CHECK (toys_delivered_count >= 0 AND toys_returned_count >= 0 AND toys_returned_count <= toys_delivered_count)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Primary user queries
CREATE INDEX idx_rental_orders_user_id ON rental_orders(user_id);
CREATE INDEX idx_rental_orders_user_status ON rental_orders(user_id, status);
CREATE INDEX idx_rental_orders_user_cycle ON rental_orders(user_id, cycle_number DESC);

-- Cycle management queries
CREATE INDEX idx_rental_orders_active_cycles ON rental_orders(user_id, rental_start_date, rental_end_date) WHERE returned_date IS NULL;
CREATE INDEX idx_rental_orders_rental_dates ON rental_orders(rental_start_date, rental_end_date);

-- Admin queries
CREATE INDEX idx_rental_orders_status ON rental_orders(status);
CREATE INDEX idx_rental_orders_created_at ON rental_orders(created_at DESC);
CREATE INDEX idx_rental_orders_delivery_date ON rental_orders(delivery_date) WHERE delivery_date IS NOT NULL;

-- Financial queries
CREATE INDEX idx_rental_orders_payment_status ON rental_orders(payment_status);

-- Search queries
CREATE INDEX idx_rental_orders_order_number ON rental_orders(order_number);
CREATE INDEX idx_rental_orders_legacy_id ON rental_orders(legacy_order_id) WHERE legacy_order_id IS NOT NULL;

-- JSONB indexes for toys data
CREATE INDEX idx_rental_orders_toys_data ON rental_orders USING GIN(toys_data);
CREATE INDEX idx_rental_orders_shipping_address ON rental_orders USING GIN(shipping_address);

-- =====================================================
-- HELPER FUNCTIONS FOR CYCLE CALCULATIONS
-- =====================================================

-- Function to calculate current day in cycle
CREATE OR REPLACE FUNCTION calculate_current_day_in_cycle(rental_start_date_param DATE)
RETURNS INTEGER AS $$
BEGIN
    IF rental_start_date_param IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN GREATEST(1, (CURRENT_DATE - rental_start_date_param) + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if selection window is active
CREATE OR REPLACE FUNCTION is_selection_window_active(rental_start_date_param DATE, returned_date_param DATE)
RETURNS BOOLEAN AS $$
DECLARE
    current_day INTEGER;
BEGIN
    IF rental_start_date_param IS NULL OR returned_date_param IS NOT NULL THEN
        RETURN false;
    END IF;
    
    current_day := calculate_current_day_in_cycle(rental_start_date_param);
    RETURN (current_day >= 24 AND current_day <= 30);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate selection window start date
CREATE OR REPLACE FUNCTION get_selection_window_start_date(rental_start_date_param DATE)
RETURNS DATE AS $$
BEGIN
    IF rental_start_date_param IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN rental_start_date_param + INTERVAL '23 days';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate selection window end date
CREATE OR REPLACE FUNCTION get_selection_window_end_date(rental_start_date_param DATE)
RETURNS DATE AS $$
BEGIN
    IF rental_start_date_param IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN rental_start_date_param + INTERVAL '29 days';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate next cycle scheduled date
CREATE OR REPLACE FUNCTION get_next_cycle_scheduled_date(rental_end_date_param DATE)
RETURNS DATE AS $$
BEGIN
    IF rental_end_date_param IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN rental_end_date_param + INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- MAIN FUNCTIONS FOR CYCLE MANAGEMENT
-- =====================================================

-- Function to get current cycle status for a user
CREATE OR REPLACE FUNCTION get_user_current_cycle(user_id_param UUID)
RETURNS TABLE (
    order_id UUID,
    order_number VARCHAR(50),
    cycle_number INTEGER,
    current_day INTEGER,
    total_days INTEGER,
    is_selection_window BOOLEAN,
    days_until_selection INTEGER,
    days_left_in_selection INTEGER,
    rental_start_date DATE,
    rental_end_date DATE,
    toys_at_home INTEGER,
    next_pickup_date DATE,
    status VARCHAR(20),
    toys_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ro.id,
        ro.order_number,
        ro.cycle_number,
        calculate_current_day_in_cycle(ro.rental_start_date) as current_day,
        30 as total_days,
        is_selection_window_active(ro.rental_start_date, ro.returned_date) as is_selection_window,
        GREATEST(0, 24 - calculate_current_day_in_cycle(ro.rental_start_date)) as days_until_selection,
        CASE 
            WHEN is_selection_window_active(ro.rental_start_date, ro.returned_date) 
            THEN GREATEST(0, 30 - calculate_current_day_in_cycle(ro.rental_start_date) + 1)
            ELSE 0
        END as days_left_in_selection,
        ro.rental_start_date,
        ro.rental_end_date,
        (ro.toys_delivered_count - ro.toys_returned_count) as toys_at_home,
        get_next_cycle_scheduled_date(ro.rental_end_date) as next_pickup_date,
        ro.status,
        ro.toys_data
    FROM rental_orders ro
    WHERE ro.user_id = user_id_param
    AND ro.returned_date IS NULL
    AND ro.rental_start_date <= CURRENT_DATE
    AND ro.rental_end_date >= CURRENT_DATE
    ORDER BY ro.rental_start_date DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's order history with cycle information
CREATE OR REPLACE FUNCTION get_user_order_history(user_id_param UUID)
RETURNS TABLE (
    order_id UUID,
    order_number VARCHAR(50),
    cycle_number INTEGER,
    status VARCHAR(20),
    rental_start_date DATE,
    rental_end_date DATE,
    returned_date DATE,
    toys_count INTEGER,
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP,
    current_day INTEGER,
    is_selection_window BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ro.id,
        ro.order_number,
        ro.cycle_number,
        ro.status,
        ro.rental_start_date,
        ro.rental_end_date,
        ro.returned_date,
        ro.toys_delivered_count,
        ro.total_amount,
        ro.created_at,
        calculate_current_day_in_cycle(ro.rental_start_date) as current_day,
        is_selection_window_active(ro.rental_start_date, ro.returned_date) as is_selection_window
    FROM rental_orders ro
    WHERE ro.user_id = user_id_param
    ORDER BY ro.rental_start_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get users in selection window (for admin)
CREATE OR REPLACE FUNCTION get_users_in_selection_window()
RETURNS TABLE (
    user_id UUID,
    order_id UUID,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    current_day INTEGER,
    days_left_in_selection INTEGER,
    rental_start_date DATE,
    rental_end_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ro.user_id,
        ro.id,
        cu.first_name,
        cu.last_name,
        cu.phone,
        calculate_current_day_in_cycle(ro.rental_start_date) as current_day,
        GREATEST(0, 30 - calculate_current_day_in_cycle(ro.rental_start_date) + 1) as days_left_in_selection,
        ro.rental_start_date,
        ro.rental_end_date
    FROM rental_orders ro
    JOIN custom_users cu ON cu.id = ro.user_id
    WHERE is_selection_window_active(ro.rental_start_date, ro.returned_date) = true
    ORDER BY calculate_current_day_in_cycle(ro.rental_start_date) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update toys return status
CREATE OR REPLACE FUNCTION update_toy_return_status(
    order_id_param UUID,
    toy_id_param UUID,
    returned_param BOOLEAN DEFAULT true
)
RETURNS BOOLEAN AS $$
DECLARE
    toys_array JSONB;
    toy_item JSONB;
    updated_toys JSONB := '[]'::jsonb;
    toy_found BOOLEAN := false;
BEGIN
    -- Get current toys data
    SELECT toys_data INTO toys_array FROM rental_orders WHERE id = order_id_param;
    
    -- Update the specific toy's return status
    FOR toy_item IN SELECT * FROM jsonb_array_elements(toys_array)
    LOOP
        IF (toy_item->>'toy_id')::UUID = toy_id_param THEN
            -- Update the returned status for this toy
            toy_item := jsonb_set(toy_item, '{returned}', to_jsonb(returned_param));
            toy_found := true;
        END IF;
        updated_toys := updated_toys || toy_item;
    END LOOP;
    
    -- Update the order with new toys data and recalculate returned count
    IF toy_found THEN
        UPDATE rental_orders 
        SET 
            toys_data = updated_toys,
            toys_returned_count = (
                SELECT COUNT(*)
                FROM jsonb_array_elements(updated_toys) AS toy
                WHERE (toy->>'returned')::boolean = true
            ),
            updated_at = NOW()
        WHERE id = order_id_param;
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rental_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_rental_orders_updated_at
    BEFORE UPDATE ON rental_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_rental_orders_updated_at();

-- =====================================================
-- VIEWS FOR EASY QUERYING
-- =====================================================

-- View with calculated cycle fields
CREATE VIEW rental_orders_with_cycle_info AS
SELECT 
    ro.*,
    calculate_current_day_in_cycle(ro.rental_start_date) as current_day_in_cycle,
    is_selection_window_active(ro.rental_start_date, ro.returned_date) as is_selection_window_active,
    get_selection_window_start_date(ro.rental_start_date) as selection_window_start_date,
    get_selection_window_end_date(ro.rental_start_date) as selection_window_end_date,
    get_next_cycle_scheduled_date(ro.rental_end_date) as next_cycle_scheduled_date,
    (ro.toys_delivered_count - ro.toys_returned_count) as toys_at_home_count
FROM rental_orders ro;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE rental_orders IS 'Unified table for all rental orders, cycle management, and user dashboard data';
COMMENT ON COLUMN rental_orders.toys_data IS 'JSONB array containing all toy information for this order';
COMMENT ON COLUMN rental_orders.shipping_address IS 'JSONB object containing complete shipping address';
COMMENT ON COLUMN rental_orders.next_cycle_toys_selected IS 'JSONB array of toys selected for next cycle during selection window';
COMMENT ON VIEW rental_orders_with_cycle_info IS 'View that includes calculated cycle management fields';

-- =====================================================
-- OPTIONAL: TEST WITH REAL USER (UNCOMMENT TO USE)
-- =====================================================

-- Test with a real user from your database
-- Replace the UUID below with an actual user ID from custom_users table

/*
DO $$
DECLARE
    real_user_id UUID;
    test_order_id UUID;
BEGIN
    -- Get a real user ID
    SELECT id INTO real_user_id FROM custom_users LIMIT 1;
    
    IF real_user_id IS NOT NULL THEN
        -- Insert test order
        INSERT INTO rental_orders (
            user_id,
            rental_start_date,
            rental_end_date,
            toys_delivered_count,
            total_amount,
            shipping_address,
            toys_data
        ) VALUES (
            real_user_id,
            CURRENT_DATE - INTERVAL '5 days',
            CURRENT_DATE + INTERVAL '25 days',
            3,
            2499.00,
            '{"first_name": "Test", "last_name": "User", "city": "Test City"}'::jsonb,
            '[{"toy_id": "11111111-1111-1111-1111-111111111111", "name": "Test Toy", "returned": false}]'::jsonb
        ) RETURNING id INTO test_order_id;
        
        RAISE NOTICE 'Test order created with ID: % for user: %', test_order_id, real_user_id;
        
        -- Test the current cycle function
        PERFORM get_user_current_cycle(real_user_id);
        RAISE NOTICE 'Current cycle function tested successfully!';
        
        -- Clean up test data
        DELETE FROM rental_orders WHERE id = test_order_id;
        RAISE NOTICE 'Test data cleaned up successfully!';
    ELSE
        RAISE NOTICE 'No users found in custom_users table for testing';
    END IF;
END $$;
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'rental_orders' 
ORDER BY ordinal_position;

-- Check functions
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%cycle%' OR routine_name LIKE '%rental%'
ORDER BY routine_name;

-- Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'rental_orders';

-- Check if view was created
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'rental_orders_with_cycle_info';

SELECT 'Phase 1 Complete: rental_orders table created successfully!' as status; 