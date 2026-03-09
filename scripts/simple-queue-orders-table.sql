-- Simple queue_orders table creation (no functions)
CREATE TABLE IF NOT EXISTS queue_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    original_subscription_id UUID,
    order_number VARCHAR(50) UNIQUE,
    selected_toys JSONB NOT NULL DEFAULT '[]'::jsonb,
    queue_cycle_number INTEGER DEFAULT 1,
    queue_order_type VARCHAR(50) DEFAULT 'next_cycle',
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    base_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    coupon_discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    applied_coupon VARCHAR(100),
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_id VARCHAR(255),
    razorpay_order_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'processing',
    delivery_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    delivery_instructions TEXT,
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    current_plan_id VARCHAR(100),
    age_group VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    notes TEXT
);

-- Add constraints
ALTER TABLE queue_orders ADD CONSTRAINT queue_orders_queue_order_type_check 
    CHECK (queue_order_type IN ('next_cycle', 'modification', 'emergency_change'));

ALTER TABLE queue_orders ADD CONSTRAINT queue_orders_payment_status_check 
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled'));

ALTER TABLE queue_orders ADD CONSTRAINT queue_orders_status_check 
    CHECK (status IN ('processing', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_queue_orders_user_id ON queue_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_orders_subscription_id ON queue_orders(original_subscription_id);
CREATE INDEX IF NOT EXISTS idx_queue_orders_status ON queue_orders(status);
CREATE INDEX IF NOT EXISTS idx_queue_orders_payment_status ON queue_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_queue_orders_created_at ON queue_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_orders_order_number ON queue_orders(order_number);

-- Enable RLS
ALTER TABLE queue_orders ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "queue_orders_select_policy" ON queue_orders
    FOR SELECT USING (true);

CREATE POLICY "queue_orders_insert_policy" ON queue_orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "queue_orders_update_policy" ON queue_orders
    FOR UPDATE USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON queue_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON queue_orders TO anon; 