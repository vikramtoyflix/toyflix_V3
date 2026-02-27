-- Step 1: Create the queue_orders table
CREATE TABLE IF NOT EXISTS queue_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    order_number VARCHAR(50) UNIQUE,
    selected_toys JSONB NOT NULL DEFAULT '[]'::jsonb,
    queue_cycle_number INTEGER DEFAULT 1,
    queue_order_type VARCHAR(50) DEFAULT 'next_cycle' CHECK (queue_order_type IN ('next_cycle', 'modification', 'emergency_change')),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    base_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    coupon_discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    applied_coupon VARCHAR(100),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
    payment_id VARCHAR(255),
    razorpay_order_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'processing' CHECK (status IN ('processing', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled')),
    delivery_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    delivery_instructions TEXT,
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    current_plan_id VARCHAR(100),
    age_group VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    notes TEXT
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_queue_orders_user_id ON queue_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_orders_subscription_id ON queue_orders(original_subscription_id);
CREATE INDEX IF NOT EXISTS idx_queue_orders_status ON queue_orders(status);
CREATE INDEX IF NOT EXISTS idx_queue_orders_payment_status ON queue_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_queue_orders_created_at ON queue_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_orders_order_number ON queue_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_queue_orders_cycle_number ON queue_orders(queue_cycle_number);

-- Step 3: Enable RLS
ALTER TABLE queue_orders ENABLE ROW LEVEL SECURITY;

-- Step 4: Create basic RLS policies
CREATE POLICY "Users can view own queue orders" ON queue_orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queue orders" ON queue_orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue orders" ON queue_orders
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Step 5: Grant permissions
GRANT SELECT, INSERT, UPDATE ON queue_orders TO authenticated;

-- Step 6: Add comments
COMMENT ON TABLE queue_orders IS 'Tracks orders for queue management and subscription modifications';
COMMENT ON COLUMN queue_orders.queue_order_type IS 'Type of queue operation: next_cycle, modification, emergency_change';
COMMENT ON COLUMN queue_orders.selected_toys IS 'JSON array of selected toys with their details';
COMMENT ON COLUMN queue_orders.queue_cycle_number IS 'Which cycle this queue order is for';
COMMENT ON COLUMN queue_orders.delivery_address IS 'Full delivery address as JSON object';
COMMENT ON COLUMN queue_orders.original_subscription_id IS 'Reference to the subscription being modified'; 