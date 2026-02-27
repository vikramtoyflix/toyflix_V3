-- Create queue_orders table for tracking subscription modification orders
CREATE TABLE IF NOT EXISTS queue_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User and subscription references
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    -- Order identification
    order_number VARCHAR(50) UNIQUE,
    
    -- Queue-specific data
    selected_toys JSONB NOT NULL DEFAULT '[]'::jsonb,
    queue_cycle_number INTEGER DEFAULT 1,
    queue_order_type VARCHAR(50) DEFAULT 'next_cycle' CHECK (queue_order_type IN ('next_cycle', 'modification', 'emergency_change')),
    
    -- Financial information
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    base_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    coupon_discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    applied_coupon VARCHAR(100),
    
    -- Payment tracking
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
    payment_id VARCHAR(255),
    razorpay_order_id VARCHAR(255),
    
    -- Order status and processing
    status VARCHAR(50) DEFAULT 'processing' CHECK (status IN ('processing', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled')),
    
    -- Delivery information
    delivery_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    delivery_instructions TEXT,
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Plan information (at time of order)
    current_plan_id VARCHAR(100),
    age_group VARCHAR(20),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_by UUID REFERENCES auth.users(id),
    notes TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_queue_orders_user_id ON queue_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_orders_subscription_id ON queue_orders(original_subscription_id);
CREATE INDEX IF NOT EXISTS idx_queue_orders_status ON queue_orders(status);
CREATE INDEX IF NOT EXISTS idx_queue_orders_payment_status ON queue_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_queue_orders_created_at ON queue_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_orders_order_number ON queue_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_queue_orders_cycle_number ON queue_orders(queue_cycle_number);

-- Create a function to generate unique order numbers
CREATE OR REPLACE FUNCTION generate_queue_order_number()
RETURNS TEXT AS $$
DECLARE
    order_num TEXT;
    counter INTEGER := 0;
BEGIN
    LOOP
        -- Generate order number with format: QU-YYYYMMDD-XXXX
        order_num := 'QU-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((FLOOR(RANDOM() * 9999) + 1)::TEXT, 4, '0');
        
        -- Check if this order number already exists
        IF NOT EXISTS (SELECT 1 FROM queue_orders WHERE order_number = order_num) THEN
            RETURN order_num;
        END IF;
        
        counter := counter + 1;
        -- Prevent infinite loop
        IF counter > 100 THEN
            order_num := 'QU-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT;
            EXIT;
        END IF;
    END LOOP;
    
    RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate order numbers
CREATE OR REPLACE FUNCTION set_queue_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := generate_queue_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_queue_order_number
    BEFORE INSERT ON queue_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_queue_order_number();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_queue_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_queue_orders_updated_at
    BEFORE UPDATE ON queue_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_queue_orders_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE queue_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for queue_orders

-- Policy: Users can view their own queue orders
CREATE POLICY "Users can view own queue orders" ON queue_orders
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own queue orders
CREATE POLICY "Users can insert own queue orders" ON queue_orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own queue orders (limited fields)
CREATE POLICY "Users can update own queue orders" ON queue_orders
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Admin users can view all queue orders
CREATE POLICY "Admin can view all queue orders" ON queue_orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role_name IN ('admin', 'super_admin')
        )
    );

-- Policy: Admin users can update all queue orders
CREATE POLICY "Admin can update all queue orders" ON queue_orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role_name IN ('admin', 'super_admin')
        )
    );

-- Policy: Admin users can insert queue orders for any user
CREATE POLICY "Admin can insert queue orders for any user" ON queue_orders
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role_name IN ('admin', 'super_admin')
        )
    );

-- Create a view for queue orders with user information
CREATE OR REPLACE VIEW queue_orders_with_user_info AS
SELECT 
    qo.*,
    p.email as user_email,
    p.phone as user_phone,
    p.first_name,
    p.last_name,
    s.plan_id as subscription_plan_id,
    s.status as subscription_status
FROM queue_orders qo
LEFT JOIN profiles p ON qo.user_id = p.id
LEFT JOIN subscriptions s ON qo.original_subscription_id = s.id;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON queue_orders TO authenticated;
GRANT SELECT ON queue_orders_with_user_info TO authenticated;

-- Add helpful comments
COMMENT ON TABLE queue_orders IS 'Tracks orders for queue management and subscription modifications';
COMMENT ON COLUMN queue_orders.queue_order_type IS 'Type of queue operation: next_cycle, modification, emergency_change';
COMMENT ON COLUMN queue_orders.selected_toys IS 'JSON array of selected toys with their details';
COMMENT ON COLUMN queue_orders.queue_cycle_number IS 'Which cycle this queue order is for';
COMMENT ON COLUMN queue_orders.delivery_address IS 'Full delivery address as JSON object';
COMMENT ON COLUMN queue_orders.original_subscription_id IS 'Reference to the subscription being modified';

-- Insert sample data for testing (optional)
-- Uncomment the following lines if you want sample data

/*
INSERT INTO queue_orders (
    user_id,
    original_subscription_id,
    selected_toys,
    total_amount,
    payment_status,
    delivery_address,
    queue_cycle_number,
    current_plan_id,
    age_group,
    status
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- Replace with actual user_id
    '00000000-0000-0000-0000-000000000000', -- Replace with actual subscription_id
    '[{"id": "toy1", "name": "Educational Blocks", "category": "building"}]'::jsonb,
    0.00,
    'paid',
    '{"first_name": "Test", "last_name": "User", "address_line1": "123 Test St", "city": "Test City", "state": "Test State", "zip_code": "12345"}'::jsonb,
    2,
    'silver-pack',
    '3-5',
    'confirmed'
) ON CONFLICT DO NOTHING;
*/ 