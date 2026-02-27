-- ========================================
-- FIX DATABASE FUNCTIONS FOR SELECTION WINDOW
-- This script resolves all console errors by dropping conflicting functions 
-- and recreating them with correct signatures
-- ========================================

-- Drop existing functions that might conflict
DROP FUNCTION IF EXISTS get_subscription_current_cycle_data(UUID);
DROP FUNCTION IF EXISTS get_subscription_stats(UUID);
DROP FUNCTION IF EXISTS get_subscription_upcoming_cycles(UUID);
DROP FUNCTION IF EXISTS get_subscription_upcoming_cycles(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_user_cycle_status(UUID);

-- ========================================
-- CREATE MISSING SUBSCRIPTION FUNCTIONS
-- ========================================

-- Function to get user cycle status (for useCycleStatus hook)
CREATE OR REPLACE FUNCTION get_user_cycle_status(user_id_param UUID)
RETURNS TABLE (
    has_active_subscription BOOLEAN,
    cycle_status TEXT,
    toys_in_possession BOOLEAN,
    selection_window_active BOOLEAN,
    days_in_current_cycle INTEGER,
    plan_id TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN ro.subscription_status = 'active' THEN true
            ELSE false
        END as has_active_subscription,
        CASE 
            WHEN get_current_cycle_day(ro.rental_start_date) BETWEEN 24 AND 34 THEN 'selection'
            ELSE 'toys_in_possession'
        END as cycle_status,
        CASE 
            WHEN ro.subscription_status = 'active' THEN true
            ELSE false
        END as toys_in_possession,
        CASE 
            WHEN (get_current_cycle_day(ro.rental_start_date) BETWEEN 24 AND 34 AND COALESCE(ro.manual_selection_control, false) = false)
                OR (COALESCE(ro.manual_selection_control, false) = true AND ro.selection_window_status = 'manual_open') THEN true
            ELSE false
        END as selection_window_active,
        get_current_cycle_day(ro.rental_start_date) as days_in_current_cycle,
        ro.subscription_plan as plan_id
    FROM public.rental_orders ro
    WHERE ro.user_id = user_id_param 
    AND ro.subscription_status = 'active'
    ORDER BY ro.rental_start_date DESC
    LIMIT 1;
END;
$$;

-- Function to get current subscription cycle data
CREATE OR REPLACE FUNCTION get_subscription_current_cycle_data(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    subscription_plan TEXT,
    subscription_status TEXT,
    rental_start_date DATE,
    rental_end_date DATE,
    cycle_number INTEGER,
    current_cycle_day INTEGER,
    days_remaining_in_cycle INTEGER,
    cycle_progress_percentage NUMERIC,
    selection_window_status TEXT,
    manual_selection_control BOOLEAN,
    selection_window_opened_at TIMESTAMP WITH TIME ZONE,
    selection_window_closed_at TIMESTAMP WITH TIME ZONE,
    selection_window_notes TEXT,
    days_until_selection_opens INTEGER,
    days_until_selection_closes INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ro.id,
        ro.user_id,
        ro.subscription_plan,
        ro.subscription_status,
        ro.rental_start_date,
        ro.rental_end_date,
        ro.cycle_number,
        get_current_cycle_day(ro.rental_start_date) as current_cycle_day,
        (30 - get_current_cycle_day(ro.rental_start_date)) as days_remaining_in_cycle,
        (get_current_cycle_day(ro.rental_start_date)::NUMERIC / 30 * 100) as cycle_progress_percentage,
        COALESCE(ro.selection_window_status, 'auto') as selection_window_status,
        COALESCE(ro.manual_selection_control, false) as manual_selection_control,
        ro.selection_window_opened_at,
        ro.selection_window_closed_at,
        ro.selection_window_notes,
        get_days_until_selection_opens(ro.rental_start_date) as days_until_selection_opens,
        get_days_until_selection_closes(ro.rental_start_date) as days_until_selection_closes
    FROM public.rental_orders ro
    WHERE ro.user_id = p_user_id 
    AND ro.subscription_status = 'active'
    ORDER BY ro.rental_start_date DESC
    LIMIT 1;
END;
$$;

-- Function to get subscription stats
CREATE OR REPLACE FUNCTION get_subscription_stats(p_user_id UUID)
RETURNS TABLE (
    total_cycles INTEGER,
    active_subscriptions INTEGER,
    total_toys_received INTEGER,
    current_plan TEXT,
    days_subscribed INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_cycles,
        COUNT(CASE WHEN ro.subscription_status = 'active' THEN 1 END)::INTEGER as active_subscriptions,
        0 as total_toys_received, -- Placeholder
        MAX(ro.subscription_plan) as current_plan,
        MAX(CASE 
            WHEN ro.subscription_status = 'active' THEN 
                EXTRACT(DAY FROM (CURRENT_DATE - ro.rental_start_date))::INTEGER
            ELSE 0
        END) as days_subscribed
    FROM public.rental_orders ro
    WHERE ro.user_id = p_user_id;
END;
$$;

-- Function to get upcoming cycles
CREATE OR REPLACE FUNCTION get_subscription_upcoming_cycles(p_user_id UUID, p_limit INTEGER DEFAULT 3)
RETURNS TABLE (
    subscription_id UUID,
    plan_id TEXT,
    plan_duration_months INTEGER,
    future_cycle_number INTEGER,
    future_cycle_start DATE,
    future_cycle_end DATE,
    future_selection_start DATE,
    future_selection_end DATE,
    estimated_delivery_date DATE,
    actual_subscription_start_date DATE
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    current_cycle_num INTEGER;
    start_date DATE;
    current_plan TEXT;
    current_subscription_id UUID;
BEGIN
    -- Get current cycle info
    SELECT 
        ro.cycle_number,
        ro.rental_start_date,
        ro.subscription_plan,
        ro.id
    INTO 
        current_cycle_num,
        start_date,
        current_plan,
        current_subscription_id
    FROM public.rental_orders ro
    WHERE ro.user_id = p_user_id 
    AND ro.subscription_status = 'active'
    ORDER BY ro.rental_start_date DESC
    LIMIT 1;
    
    -- Return empty if no active subscription
    IF current_cycle_num IS NULL THEN
        RETURN;
    END IF;
    
    -- Generate future cycles
    FOR i IN 1..p_limit LOOP
        RETURN QUERY
        SELECT 
            current_subscription_id,
            current_plan,
            6 as plan_duration_months, -- Default 6 months
            (current_cycle_num + i) as future_cycle_number,
            (start_date + ((current_cycle_num + i - 1) * 30)) as future_cycle_start,
            (start_date + ((current_cycle_num + i - 1) * 30) + 29) as future_cycle_end,
            (start_date + ((current_cycle_num + i - 1) * 30) + 23) as future_selection_start,
            (start_date + ((current_cycle_num + i - 1) * 30) + 29) as future_selection_end,
            (start_date + ((current_cycle_num + i - 1) * 30) + 30) as estimated_delivery_date,
            start_date as actual_subscription_start_date;
    END LOOP;
END;
$$;

-- ========================================
-- CREATE NEXT CYCLE QUEUE TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS public.next_cycle_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.custom_users(id) ON DELETE CASCADE,
    toy_id TEXT NOT NULL,
    toy_name TEXT,
    toy_category TEXT,
    age_group TEXT,
    queue_position INTEGER,
    pending BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for next_cycle_queue
CREATE INDEX IF NOT EXISTS idx_next_cycle_queue_user_id ON public.next_cycle_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_next_cycle_queue_pending ON public.next_cycle_queue(pending);
CREATE INDEX IF NOT EXISTS idx_next_cycle_queue_user_pending ON public.next_cycle_queue(user_id, pending);

-- Enable Row Level Security for next_cycle_queue
ALTER TABLE public.next_cycle_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own queue" ON public.next_cycle_queue;
DROP POLICY IF EXISTS "Users can insert their own queue items" ON public.next_cycle_queue;
DROP POLICY IF EXISTS "Users can update their own queue items" ON public.next_cycle_queue;
DROP POLICY IF EXISTS "Users can delete their own queue items" ON public.next_cycle_queue;

-- Create RLS policies for next_cycle_queue
CREATE POLICY "Users can view their own queue" ON public.next_cycle_queue
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queue items" ON public.next_cycle_queue
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queue items" ON public.next_cycle_queue
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own queue items" ON public.next_cycle_queue
    FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- ENSURE SELECTION WINDOW COLUMNS EXIST
-- ========================================

-- Add selection window columns if they don't exist
ALTER TABLE public.rental_orders 
ADD COLUMN IF NOT EXISTS selection_window_status TEXT DEFAULT 'auto';

ALTER TABLE public.rental_orders 
ADD COLUMN IF NOT EXISTS selection_window_opened_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.rental_orders 
ADD COLUMN IF NOT EXISTS selection_window_closed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.rental_orders 
ADD COLUMN IF NOT EXISTS manual_selection_control BOOLEAN DEFAULT false;

ALTER TABLE public.rental_orders 
ADD COLUMN IF NOT EXISTS selection_window_auto_close_date DATE;

ALTER TABLE public.rental_orders 
ADD COLUMN IF NOT EXISTS selection_window_notes TEXT;

-- Add constraint for selection_window_status if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'rental_orders_selection_window_status_check'
    ) THEN
        ALTER TABLE public.rental_orders 
        ADD CONSTRAINT rental_orders_selection_window_status_check 
        CHECK (selection_window_status IN ('auto', 'manual_open', 'manual_closed', 'force_open', 'force_closed'));
    END IF;
END $$;

-- ========================================
-- ENSURE HELPER FUNCTIONS EXIST
-- ========================================

-- Recreate helper functions to ensure they exist
CREATE OR REPLACE FUNCTION get_current_cycle_day(p_rental_start_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    IF p_rental_start_date IS NULL THEN
        RETURN 1;
    END IF;
    RETURN GREATEST(1, EXTRACT(DAY FROM (CURRENT_DATE - p_rental_start_date)) + 1);
END;
$$;

CREATE OR REPLACE FUNCTION get_days_until_selection_opens(p_rental_start_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_cycle_day INTEGER;
BEGIN
    IF p_rental_start_date IS NULL THEN
        RETURN 0;
    END IF;
    
    v_cycle_day := get_current_cycle_day(p_rental_start_date);
    
    IF v_cycle_day >= 24 THEN
        RETURN 0; -- Already at or past day 24
    ELSE
        RETURN 24 - v_cycle_day; -- Days until day 24
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_days_until_selection_closes(p_rental_start_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_cycle_day INTEGER;
BEGIN
    IF p_rental_start_date IS NULL THEN
        RETURN 0;
    END IF;
    
    v_cycle_day := get_current_cycle_day(p_rental_start_date);
    
    IF v_cycle_day > 34 THEN
        RETURN 0; -- Already past day 34
    ELSE
        RETURN GREATEST(0, 34 - v_cycle_day); -- Days until day 34
    END IF;
END;
$$;

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Grant table permissions
GRANT ALL ON public.next_cycle_queue TO authenticated;
GRANT SELECT, UPDATE ON public.rental_orders TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION get_subscription_current_cycle_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_upcoming_cycles(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_cycle_day(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_days_until_selection_opens(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_days_until_selection_closes(DATE) TO authenticated;

-- Grant permissions for existing selection window functions
GRANT EXECUTE ON FUNCTION control_selection_window(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_selection_window_to_auto(UUID) TO authenticated;

-- Grant view permissions
GRANT SELECT ON public.selection_window_dashboard TO authenticated;

-- ========================================
-- UPDATE EXISTING DATA
-- ========================================

-- Set default values for existing records
UPDATE public.rental_orders 
SET 
    selection_window_status = 'auto',
    manual_selection_control = false,
    selection_window_auto_close_date = rental_start_date + INTERVAL '34 days'
WHERE 
    selection_window_status IS NULL 
    OR selection_window_auto_close_date IS NULL
    AND rental_start_date IS NOT NULL;

-- ========================================
-- VERIFICATION
-- ========================================

-- Verify functions were created successfully
DO $$
DECLARE
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_name IN (
        'get_subscription_current_cycle_data',
        'get_subscription_stats', 
        'get_subscription_upcoming_cycles',
        'control_selection_window',
        'reset_selection_window_to_auto',
        'get_current_cycle_day',
        'get_days_until_selection_opens',
        'get_days_until_selection_closes'
    )
    AND routine_schema = 'public';
    
    RAISE NOTICE 'Created % database functions successfully', function_count;
    
    -- Verify table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'next_cycle_queue') THEN
        RAISE NOTICE 'next_cycle_queue table created successfully';
    END IF;
    
    -- Verify columns exist
    SELECT COUNT(*) INTO function_count
    FROM information_schema.columns
    WHERE table_name = 'rental_orders' 
    AND column_name LIKE '%selection_window%';
    
    RAISE NOTICE 'Added % selection window columns to rental_orders table', function_count;
END $$; 