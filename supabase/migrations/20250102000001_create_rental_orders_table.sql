-- Create rental_orders table for migrated WooCommerce orders
-- This table consolidates order data from CSV migration

CREATE TABLE IF NOT EXISTS public.rental_orders (
    -- Primary key and references
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES public.custom_users(id) ON DELETE CASCADE,
    legacy_order_id TEXT,
    legacy_created_at TIMESTAMP WITH TIME ZONE,
    migrated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Order status and type
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'active', 'returned', 'cancelled', 'completed')),
    order_type TEXT DEFAULT 'subscription' CHECK (order_type IN ('subscription', 'one_time', 'trial')),
    
    -- Subscription details
    subscription_plan TEXT,
    subscription_id UUID,
    subscription_category TEXT,
    age_group TEXT,
    
    -- Financial information
    total_amount NUMERIC(10,2) DEFAULT 0,
    base_amount NUMERIC(10,2) DEFAULT 0,
    gst_amount NUMERIC(10,2) DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    payment_amount NUMERIC(10,2) DEFAULT 0,
    payment_currency TEXT DEFAULT 'INR',
    
    -- Payment details
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
    payment_method TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    coupon_code TEXT,
    
    -- Rental cycle information
    cycle_number INTEGER DEFAULT 1,
    rental_start_date DATE NOT NULL,
    rental_end_date DATE NOT NULL,
    
    -- Delivery information
    delivery_date DATE,
    returned_date DATE,
    return_status TEXT DEFAULT 'not_returned' CHECK (return_status IN ('not_returned', 'partial', 'complete', 'lost', 'damaged')),
    
    -- Toys data (JSONB for flexible storage)
    toys_data JSONB DEFAULT '[]'::jsonb,
    toys_delivered_count INTEGER DEFAULT 0,
    toys_returned_count INTEGER DEFAULT 0,
    
    -- Address information (JSONB for structured data)
    shipping_address JSONB,
    delivery_instructions TEXT,
    pickup_instructions TEXT,
    
    -- Next cycle information
    next_cycle_address JSONB,
    next_cycle_toys_selected BOOLEAN DEFAULT false,
    next_cycle_prepared BOOLEAN DEFAULT false,
    
    -- Quality feedback
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    feedback TEXT,
    damage_reported BOOLEAN DEFAULT false,
    damage_details TEXT,
    
    -- Admin information
    admin_notes TEXT,
    internal_status TEXT DEFAULT 'active',
    dispatch_tracking_number TEXT,
    return_tracking_number TEXT,
    
    -- User contact information
    user_phone TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES public.custom_users(id),
    updated_by UUID REFERENCES public.custom_users(id),
    
    -- Status timestamps
    confirmed_at TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rental_orders_user_id ON public.rental_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_order_number ON public.rental_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_rental_orders_status ON public.rental_orders(status);
CREATE INDEX IF NOT EXISTS idx_rental_orders_created_at ON public.rental_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_rental_orders_rental_dates ON public.rental_orders(rental_start_date, rental_end_date);
CREATE INDEX IF NOT EXISTS idx_rental_orders_payment_status ON public.rental_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_rental_orders_cycle_number ON public.rental_orders(cycle_number);
CREATE INDEX IF NOT EXISTS idx_rental_orders_subscription_plan ON public.rental_orders(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_rental_orders_user_phone ON public.rental_orders(user_phone);

-- Enable RLS on rental_orders table
ALTER TABLE public.rental_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for rental_orders
CREATE POLICY "Users can view their own rental orders" ON public.rental_orders
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own rental orders" ON public.rental_orders
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all rental orders" ON public.rental_orders
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Admins can manage all rental orders" ON public.rental_orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.custom_users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER update_rental_orders_updated_at 
    BEFORE UPDATE ON public.rental_orders 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.rental_orders IS 'Consolidated rental orders table for migrated WooCommerce data and new orders';
COMMENT ON COLUMN public.rental_orders.toys_data IS 'JSONB array containing toy details for each order';
COMMENT ON COLUMN public.rental_orders.shipping_address IS 'JSONB object containing structured shipping address data';
COMMENT ON COLUMN public.rental_orders.next_cycle_address IS 'JSONB object containing address for next cycle delivery';
COMMENT ON COLUMN public.rental_orders.legacy_order_id IS 'Original WooCommerce order ID for migrated orders';
COMMENT ON COLUMN public.rental_orders.migrated_at IS 'Timestamp when order was migrated from WooCommerce'; 