-- ========================================
-- ADD SUBSCRIPTION STATUS COLUMN TO RENTAL ORDERS
-- Implements subscription management with admin control
-- ========================================

-- Add subscription_status column to rental_orders
ALTER TABLE public.rental_orders 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' 
CHECK (subscription_status IN ('active', 'deactivated', 'paused', 'cancelled', 'expired', 'pending'));

-- Update existing records to be active by default
UPDATE public.rental_orders 
SET subscription_status = 'active' 
WHERE subscription_status IS NULL;

-- Add index for performance optimization
CREATE INDEX IF NOT EXISTS idx_rental_orders_subscription_status 
ON public.rental_orders(subscription_status);

-- Add compound index for active subscriptions by user (most common query)
CREATE INDEX IF NOT EXISTS idx_rental_orders_active_user 
ON public.rental_orders(user_id, subscription_status) 
WHERE subscription_status = 'active';

-- Add compound index for subscription management queries
CREATE INDEX IF NOT EXISTS idx_rental_orders_subscription_management 
ON public.rental_orders(user_id, subscription_status, cycle_number, rental_start_date);

-- Add comments for documentation
COMMENT ON COLUMN public.rental_orders.subscription_status IS 'Administrative control for subscription visibility: active, deactivated, paused, cancelled, expired, pending';

-- Create function to get active subscriptions for a user
CREATE OR REPLACE FUNCTION get_active_subscription_for_user(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    order_number TEXT,
    subscription_plan TEXT,
    cycle_number INTEGER,
    rental_start_date DATE,
    rental_end_date DATE,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ro.id,
        ro.order_number,
        ro.subscription_plan,
        ro.cycle_number,
        ro.rental_start_date,
        ro.rental_end_date,
        ro.status,
        ro.created_at
    FROM public.rental_orders ro
    WHERE ro.user_id = p_user_id
    AND ro.subscription_status = 'active'
    ORDER BY ro.rental_start_date DESC, ro.cycle_number DESC;
END;
$$;

-- Create function to get subscription status summary for admin
CREATE OR REPLACE FUNCTION get_subscription_status_summary()
RETURNS TABLE (
    subscription_status TEXT,
    count BIGINT,
    total_amount NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ro.subscription_status,
        COUNT(*) as count,
        SUM(ro.total_amount) as total_amount
    FROM public.rental_orders ro
    GROUP BY ro.subscription_status
    ORDER BY count DESC;
END;
$$;

-- Add audit trigger for subscription status changes
CREATE OR REPLACE FUNCTION audit_subscription_status_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Log subscription status changes
    IF OLD.subscription_status IS DISTINCT FROM NEW.subscription_status THEN
        INSERT INTO public.audit_log (
            table_name,
            record_id,
            action,
            old_values,
            new_values,
            changed_by,
            changed_at
        ) VALUES (
            'rental_orders',
            NEW.id,
            'subscription_status_change',
            jsonb_build_object('subscription_status', OLD.subscription_status),
            jsonb_build_object('subscription_status', NEW.subscription_status),
            NEW.updated_by,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS audit_subscription_status_trigger ON public.rental_orders;
CREATE TRIGGER audit_subscription_status_trigger
    AFTER UPDATE ON public.rental_orders
    FOR EACH ROW
    EXECUTE FUNCTION audit_subscription_status_changes();

-- Grant necessary permissions
GRANT SELECT ON public.rental_orders TO anon;
GRANT SELECT, UPDATE ON public.rental_orders TO authenticated;
GRANT ALL ON public.rental_orders TO service_role;

-- Final validation
DO $$
BEGIN
    -- Check if the column was added successfully
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rental_orders' 
        AND column_name = 'subscription_status'
    ) THEN
        RAISE EXCEPTION 'subscription_status column was not added successfully';
    END IF;
    
    -- Check if indexes were created
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_rental_orders_subscription_status'
    ) THEN
        RAISE EXCEPTION 'subscription_status index was not created successfully';
    END IF;
    
    RAISE NOTICE 'Subscription status column and indexes added successfully';
END $$; 