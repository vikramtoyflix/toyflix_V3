-- ========================================
-- Subscription Cycle Tracking Schema Migration
-- Implements proper subscription cycle management
-- ========================================

-- ========================================
-- STEP 1: Add subscription cycle tracking fields to subscriptions table
-- ========================================

-- Add cycle tracking fields to existing subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS cycle_start_date DATE,
ADD COLUMN IF NOT EXISTS cycle_end_date DATE,
ADD COLUMN IF NOT EXISTS cycle_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_selection_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_selection_window_start DATE,
ADD COLUMN IF NOT EXISTS next_selection_window_end DATE,
ADD COLUMN IF NOT EXISTS subscription_start_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS total_cycles_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_cycle_status TEXT DEFAULT 'active' CHECK (current_cycle_status IN ('active', 'selection_open', 'selection_closed', 'delivery_pending', 'completed', 'paused'));

-- Update existing subscriptions to have proper cycle tracking
UPDATE public.subscriptions 
SET 
    cycle_start_date = COALESCE(current_period_start, start_date),
    cycle_end_date = COALESCE(current_period_end, start_date + INTERVAL '30 days'),
    subscription_start_date = start_date,
    cycle_number = GREATEST(1, EXTRACT(DAY FROM (CURRENT_DATE - start_date))::INTEGER / 30 + 1),
    total_cycles_completed = GREATEST(0, EXTRACT(DAY FROM (CURRENT_DATE - start_date))::INTEGER / 30),
    next_selection_window_start = COALESCE(current_period_start, start_date) + INTERVAL '23 days',
    next_selection_window_end = COALESCE(current_period_start, start_date) + INTERVAL '29 days'
WHERE cycle_start_date IS NULL;

-- ========================================
-- STEP 2: Create subscription_cycles table for cycle history tracking
-- ========================================

CREATE TABLE IF NOT EXISTS public.subscription_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.custom_users(id) ON DELETE CASCADE,
    
    -- Cycle identification
    cycle_number INTEGER NOT NULL,
    cycle_start_date DATE NOT NULL,
    cycle_end_date DATE NOT NULL,
    
    -- Selection window tracking
    selection_window_start DATE NOT NULL,
    selection_window_end DATE NOT NULL,
    selection_opened_at TIMESTAMP WITH TIME ZONE,
    selection_closed_at TIMESTAMP WITH TIME ZONE,
    toys_selected_at TIMESTAMP WITH TIME ZONE,
    
    -- Cycle data
    selected_toys JSONB DEFAULT '[]'::jsonb,
    toys_count INTEGER DEFAULT 0,
    total_toy_value DECIMAL(10,2) DEFAULT 0.00,
    
    -- Delivery tracking
    delivery_scheduled_date DATE,
    delivery_actual_date DATE,
    delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'scheduled', 'shipped', 'delivered', 'failed', 'cancelled')),
    tracking_number TEXT,
    delivery_address JSONB,
    
    -- Cycle status and completion
    cycle_status TEXT DEFAULT 'upcoming' CHECK (cycle_status IN ('upcoming', 'active', 'selection_open', 'selection_closed', 'preparing', 'shipped', 'delivered', 'completed', 'cancelled')),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Billing alignment
    billing_cycle_id TEXT, -- For aligning with external billing systems
    billing_amount DECIMAL(10,2),
    billing_status TEXT DEFAULT 'pending' CHECK (billing_status IN ('pending', 'billed', 'paid', 'failed', 'refunded')),
    
    -- Plan information at time of cycle
    plan_id_at_cycle TEXT NOT NULL,
    plan_details JSONB, -- Store plan configuration at time of cycle
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Constraints
    UNIQUE(subscription_id, cycle_number)
);

-- Create indexes for subscription_cycles
CREATE INDEX IF NOT EXISTS idx_subscription_cycles_subscription_id ON public.subscription_cycles(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_cycles_user_id ON public.subscription_cycles(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_cycles_cycle_number ON public.subscription_cycles(cycle_number);
CREATE INDEX IF NOT EXISTS idx_subscription_cycles_cycle_dates ON public.subscription_cycles(cycle_start_date, cycle_end_date);
CREATE INDEX IF NOT EXISTS idx_subscription_cycles_selection_window ON public.subscription_cycles(selection_window_start, selection_window_end);
CREATE INDEX IF NOT EXISTS idx_subscription_cycles_status ON public.subscription_cycles(cycle_status);
CREATE INDEX IF NOT EXISTS idx_subscription_cycles_delivery_status ON public.subscription_cycles(delivery_status);
CREATE INDEX IF NOT EXISTS idx_subscription_cycles_created_at ON public.subscription_cycles(created_at);

-- ========================================
-- STEP 3: Update queue_orders table to link with subscription cycles
-- ========================================

-- Add subscription cycle tracking to queue_orders
ALTER TABLE public.queue_orders 
ADD COLUMN IF NOT EXISTS subscription_cycle_id UUID REFERENCES public.subscription_cycles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS subscription_cycle_number INTEGER,
ADD COLUMN IF NOT EXISTS cycle_based_delivery_date DATE,
ADD COLUMN IF NOT EXISTS subscription_aligned BOOLEAN DEFAULT FALSE;

-- Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_queue_orders_subscription_cycle_id ON public.queue_orders(subscription_cycle_id);
CREATE INDEX IF NOT EXISTS idx_queue_orders_subscription_cycle_number ON public.queue_orders(subscription_cycle_number);

-- ========================================
-- STEP 4: Create subscription timeline views
-- ========================================

-- View for current cycle status
CREATE OR REPLACE VIEW public.subscription_current_cycle AS
SELECT 
    s.id as subscription_id,
    s.user_id,
    s.plan_id,
    s.status as subscription_status,
    s.cycle_number as current_cycle_number,
    s.cycle_start_date as current_cycle_start,
    s.cycle_end_date as current_cycle_end,
    s.last_selection_date,
    s.next_selection_window_start,
    s.next_selection_window_end,
    s.current_cycle_status,
    s.total_cycles_completed,
    
    -- Current cycle progress
    CASE 
        WHEN s.cycle_start_date IS NOT NULL AND s.cycle_end_date IS NOT NULL THEN
            ROUND(
                (EXTRACT(DAY FROM (CURRENT_DATE - s.cycle_start_date))::NUMERIC / 
                 EXTRACT(DAY FROM (s.cycle_end_date - s.cycle_start_date))::NUMERIC) * 100, 2
            )
        ELSE 0
    END as cycle_progress_percentage,
    
    -- Days in current cycle
    CASE 
        WHEN s.cycle_start_date IS NOT NULL THEN
            EXTRACT(DAY FROM (CURRENT_DATE - s.cycle_start_date))::INTEGER + 1
        ELSE 1
    END as current_day_in_cycle,
    
    -- Days remaining in cycle
    CASE 
        WHEN s.cycle_end_date IS NOT NULL THEN
            EXTRACT(DAY FROM (s.cycle_end_date - CURRENT_DATE))::INTEGER
        ELSE 30
    END as days_remaining_in_cycle,
    
    -- Selection window status
    CASE 
        WHEN CURRENT_DATE BETWEEN s.next_selection_window_start AND s.next_selection_window_end THEN 'open'
        WHEN CURRENT_DATE < s.next_selection_window_start THEN 'upcoming'
        ELSE 'closed'
    END as selection_window_status,
    
    -- Days until/since selection window
    CASE 
        WHEN CURRENT_DATE < s.next_selection_window_start THEN
            EXTRACT(DAY FROM (s.next_selection_window_start - CURRENT_DATE))::INTEGER
        WHEN CURRENT_DATE > s.next_selection_window_end THEN
            -EXTRACT(DAY FROM (CURRENT_DATE - s.next_selection_window_end))::INTEGER
        ELSE 0
    END as days_to_selection_window,
    
    s.subscription_start_date,
    EXTRACT(DAY FROM (CURRENT_DATE - s.subscription_start_date))::INTEGER as total_days_subscribed,
    s.created_at,
    s.updated_at
FROM public.subscriptions s
WHERE s.status IN ('active', 'paused');

-- View for cycle history
CREATE OR REPLACE VIEW public.subscription_cycle_history AS
SELECT 
    sc.id as cycle_id,
    sc.subscription_id,
    sc.user_id,
    sc.cycle_number,
    sc.cycle_start_date,
    sc.cycle_end_date,
    sc.selection_window_start,
    sc.selection_window_end,
    sc.selection_opened_at,
    sc.selection_closed_at,
    sc.toys_selected_at,
    sc.selected_toys,
    sc.toys_count,
    sc.total_toy_value,
    sc.delivery_scheduled_date,
    sc.delivery_actual_date,
    sc.delivery_status,
    sc.tracking_number,
    sc.cycle_status,
    sc.completed_at,
    sc.plan_id_at_cycle,
    sc.billing_amount,
    sc.billing_status,
    
    -- Cycle duration
    EXTRACT(DAY FROM (sc.cycle_end_date - sc.cycle_start_date))::INTEGER as cycle_duration_days,
    
    -- Selection window duration
    EXTRACT(DAY FROM (sc.selection_window_end - sc.selection_window_start))::INTEGER as selection_window_duration,
    
    -- Delivery performance
    CASE 
        WHEN sc.delivery_actual_date IS NOT NULL AND sc.delivery_scheduled_date IS NOT NULL THEN
            EXTRACT(DAY FROM (sc.delivery_actual_date - sc.delivery_scheduled_date))::INTEGER
        ELSE NULL
    END as delivery_delay_days,
    
    -- Cycle completion metrics
    CASE 
        WHEN sc.completed_at IS NOT NULL THEN
            EXTRACT(DAY FROM (sc.completed_at - sc.cycle_start_date))::INTEGER
        ELSE NULL
    END as cycle_completion_days,
    
    sc.created_at,
    sc.updated_at
FROM public.subscription_cycles sc
ORDER BY sc.subscription_id, sc.cycle_number DESC;

-- View for upcoming cycles
CREATE OR REPLACE VIEW public.subscription_upcoming_cycles AS
SELECT 
    s.id as subscription_id,
    s.user_id,
    s.plan_id,
    s.cycle_number + generate_series(1, 6) as future_cycle_number,
    s.cycle_end_date + (generate_series(0, 5) * INTERVAL '30 days') as future_cycle_start,
    s.cycle_end_date + (generate_series(1, 6) * INTERVAL '30 days') as future_cycle_end,
    s.cycle_end_date + (generate_series(0, 5) * INTERVAL '30 days') + INTERVAL '23 days' as future_selection_start,
    s.cycle_end_date + (generate_series(0, 5) * INTERVAL '30 days') + INTERVAL '29 days' as future_selection_end,
    s.cycle_end_date + (generate_series(1, 6) * INTERVAL '30 days') + INTERVAL '1 day' as estimated_delivery_date
FROM public.subscriptions s
WHERE s.status = 'active';

-- View for selection windows
CREATE OR REPLACE VIEW public.subscription_selection_windows AS
SELECT 
    sc.subscription_id,
    sc.user_id,
    sc.cycle_number,
    sc.selection_window_start,
    sc.selection_window_end,
    sc.selection_opened_at,
    sc.selection_closed_at,
    sc.toys_selected_at,
    sc.toys_count,
    sc.cycle_status,
    
    -- Selection window status
    CASE 
        WHEN CURRENT_DATE < sc.selection_window_start THEN 'upcoming'
        WHEN CURRENT_DATE BETWEEN sc.selection_window_start AND sc.selection_window_end THEN 'open'
        WHEN CURRENT_DATE > sc.selection_window_end AND sc.toys_selected_at IS NULL THEN 'missed'
        WHEN sc.toys_selected_at IS NOT NULL THEN 'completed'
        ELSE 'closed'
    END as window_status,
    
    -- Time calculations
    CASE 
        WHEN CURRENT_DATE < sc.selection_window_start THEN
            EXTRACT(DAY FROM (sc.selection_window_start - CURRENT_DATE))::INTEGER
        ELSE 0
    END as days_until_opens,
    
    CASE 
        WHEN CURRENT_DATE BETWEEN sc.selection_window_start AND sc.selection_window_end THEN
            EXTRACT(DAY FROM (sc.selection_window_end - CURRENT_DATE))::INTEGER
        ELSE 0
    END as days_until_closes,
    
    -- Selection performance
    CASE 
        WHEN sc.toys_selected_at IS NOT NULL AND sc.selection_window_start IS NOT NULL THEN
            EXTRACT(DAY FROM (sc.toys_selected_at - sc.selection_window_start))::INTEGER
        ELSE NULL
    END as days_to_select,
    
    sc.created_at,
    sc.updated_at
FROM public.subscription_cycles sc
WHERE sc.cycle_status IN ('upcoming', 'active', 'selection_open', 'selection_closed')
ORDER BY sc.subscription_id, sc.cycle_number;

-- ========================================
-- STEP 5: Create functions for cycle management
-- ========================================

-- Function to create a new subscription cycle
CREATE OR REPLACE FUNCTION public.create_subscription_cycle(
    p_subscription_id UUID,
    p_cycle_number INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_subscription RECORD;
    v_cycle_number INTEGER;
    v_cycle_start DATE;
    v_cycle_end DATE;
    v_selection_start DATE;
    v_selection_end DATE;
    v_cycle_id UUID;
BEGIN
    -- Get subscription details
    SELECT * INTO v_subscription
    FROM public.subscriptions 
    WHERE id = p_subscription_id AND status IN ('active', 'paused');
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active subscription not found: %', p_subscription_id;
    END IF;
    
    -- Determine cycle number
    v_cycle_number := COALESCE(p_cycle_number, v_subscription.cycle_number + 1);
    
    -- Calculate cycle dates
    v_cycle_start := v_subscription.subscription_start_date + ((v_cycle_number - 1) * INTERVAL '30 days')::DATE;
    v_cycle_end := v_cycle_start + INTERVAL '29 days';
    v_selection_start := v_cycle_start + INTERVAL '23 days';
    v_selection_end := v_cycle_start + INTERVAL '29 days';
    
    -- Create the cycle record
    INSERT INTO public.subscription_cycles (
        subscription_id,
        user_id,
        cycle_number,
        cycle_start_date,
        cycle_end_date,
        selection_window_start,
        selection_window_end,
        plan_id_at_cycle,
        plan_details,
        delivery_scheduled_date,
        cycle_status
    ) VALUES (
        p_subscription_id,
        v_subscription.user_id,
        v_cycle_number,
        v_cycle_start,
        v_cycle_end,
        v_selection_start,
        v_selection_end,
        v_subscription.plan_id,
        jsonb_build_object(
            'plan_id', v_subscription.plan_id,
            'subscription_type', v_subscription.subscription_type,
            'created_at', v_subscription.created_at
        ),
        v_cycle_end + INTERVAL '1 day',
        CASE 
            WHEN v_cycle_start > CURRENT_DATE THEN 'upcoming'
            WHEN v_cycle_start <= CURRENT_DATE AND v_cycle_end >= CURRENT_DATE THEN 'active'
            ELSE 'completed'
        END
    ) RETURNING id INTO v_cycle_id;
    
    -- Update subscription with new cycle info if this is the current cycle
    IF v_cycle_start <= CURRENT_DATE AND v_cycle_end >= CURRENT_DATE THEN
        UPDATE public.subscriptions 
        SET 
            cycle_number = v_cycle_number,
            cycle_start_date = v_cycle_start,
            cycle_end_date = v_cycle_end,
            next_selection_window_start = v_selection_start,
            next_selection_window_end = v_selection_end,
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = p_subscription_id;
    END IF;
    
    RETURN v_cycle_id;
END;
$$;

-- Function to update cycle status
CREATE OR REPLACE FUNCTION public.update_cycle_status(
    p_cycle_id UUID,
    p_new_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cycle RECORD;
BEGIN
    -- Validate status
    IF p_new_status NOT IN ('upcoming', 'active', 'selection_open', 'selection_closed', 'preparing', 'shipped', 'delivered', 'completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid cycle status: %', p_new_status;
    END IF;
    
    -- Get current cycle
    SELECT * INTO v_cycle
    FROM public.subscription_cycles
    WHERE id = p_cycle_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cycle not found: %', p_cycle_id;
    END IF;
    
    -- Update cycle status
    UPDATE public.subscription_cycles
    SET 
        cycle_status = p_new_status,
        completed_at = CASE WHEN p_new_status = 'completed' THEN TIMEZONE('utc'::text, NOW()) ELSE completed_at END,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = p_cycle_id;
    
    -- Update subscription status if needed
    IF p_new_status = 'selection_open' THEN
        UPDATE public.subscriptions
        SET 
            current_cycle_status = 'selection_open',
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = v_cycle.subscription_id;
    ELSIF p_new_status = 'completed' THEN
        UPDATE public.subscriptions
        SET 
            total_cycles_completed = total_cycles_completed + 1,
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = v_cycle.subscription_id;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Function to record toy selection for a cycle
CREATE OR REPLACE FUNCTION public.record_cycle_toy_selection(
    p_cycle_id UUID,
    p_selected_toys JSONB,
    p_total_value DECIMAL DEFAULT 0.00
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cycle RECORD;
    v_toys_count INTEGER;
BEGIN
    -- Get cycle details
    SELECT * INTO v_cycle
    FROM public.subscription_cycles
    WHERE id = p_cycle_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cycle not found: %', p_cycle_id;
    END IF;
    
    -- Count toys
    v_toys_count := jsonb_array_length(p_selected_toys);
    
    -- Update cycle with selection
    UPDATE public.subscription_cycles
    SET 
        selected_toys = p_selected_toys,
        toys_count = v_toys_count,
        total_toy_value = p_total_value,
        toys_selected_at = TIMEZONE('utc'::text, NOW()),
        cycle_status = CASE 
            WHEN cycle_status = 'selection_open' THEN 'selection_closed'
            ELSE cycle_status
        END,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = p_cycle_id;
    
    -- Update subscription last selection date
    UPDATE public.subscriptions
    SET 
        last_selection_date = TIMEZONE('utc'::text, NOW()),
        current_cycle_status = 'selection_closed',
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = v_cycle.subscription_id;
    
    RETURN TRUE;
END;
$$;

-- ========================================
-- STEP 6: Create triggers for automatic cycle management
-- ========================================

-- Trigger function to update cycle timestamps
CREATE OR REPLACE FUNCTION public.update_subscription_cycles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$;

-- Create the update trigger
CREATE TRIGGER trigger_update_subscription_cycles_updated_at
    BEFORE UPDATE ON public.subscription_cycles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_subscription_cycles_updated_at();

-- ========================================
-- STEP 7: Enable Row Level Security for new tables
-- ========================================

-- Enable RLS for subscription_cycles
ALTER TABLE public.subscription_cycles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_cycles
CREATE POLICY "Users can view own subscription cycles" ON public.subscription_cycles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role manages subscription cycles" ON public.subscription_cycles
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Admin access policy
CREATE POLICY "Admin can view all subscription cycles" ON public.subscription_cycles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.custom_users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ========================================
-- STEP 8: Create initial cycle data for existing subscriptions
-- ========================================

-- Populate subscription_cycles for existing active subscriptions
DO $$
DECLARE
    subscription_record RECORD;
    cycle_id UUID;
BEGIN
    FOR subscription_record IN 
        SELECT id, user_id, plan_id, cycle_number, subscription_start_date, cycle_start_date, cycle_end_date
        FROM public.subscriptions 
        WHERE status = 'active' AND cycle_number IS NOT NULL
    LOOP
        -- Create current cycle record
        SELECT public.create_subscription_cycle(subscription_record.id, subscription_record.cycle_number) INTO cycle_id;
        
        RAISE NOTICE 'Created cycle % for subscription %', subscription_record.cycle_number, subscription_record.id;
    END LOOP;
END $$;

-- ========================================
-- STEP 9: Add helpful comments
-- ========================================

COMMENT ON TABLE public.subscription_cycles IS 'Tracks individual subscription cycle history with delivery and selection data';
COMMENT ON TABLE public.subscriptions IS 'Enhanced with cycle tracking fields for subscription-based toy selection';

COMMENT ON COLUMN public.subscription_cycles.cycle_number IS 'Sequential cycle number since subscription start';
COMMENT ON COLUMN public.subscription_cycles.selected_toys IS 'JSON array of toys selected for this cycle';
COMMENT ON COLUMN public.subscription_cycles.selection_window_start IS 'When toy selection opens for this cycle';
COMMENT ON COLUMN public.subscription_cycles.selection_window_end IS 'When toy selection closes for this cycle';
COMMENT ON COLUMN public.subscription_cycles.delivery_status IS 'Current delivery status for this cycle';
COMMENT ON COLUMN public.subscription_cycles.plan_id_at_cycle IS 'Plan ID at the time this cycle was created';

COMMENT ON VIEW public.subscription_current_cycle IS 'Real-time view of current subscription cycle status';
COMMENT ON VIEW public.subscription_cycle_history IS 'Historical view of all completed and active cycles';
COMMENT ON VIEW public.subscription_upcoming_cycles IS 'Projected future cycles based on current subscription';
COMMENT ON VIEW public.subscription_selection_windows IS 'Selection window status and timing for all cycles';

-- ========================================
-- STEP 10: Grant permissions
-- ========================================

GRANT SELECT ON public.subscription_current_cycle TO authenticated;
GRANT SELECT ON public.subscription_cycle_history TO authenticated;
GRANT SELECT ON public.subscription_upcoming_cycles TO authenticated;
GRANT SELECT ON public.subscription_selection_windows TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.subscription_cycles TO authenticated;

-- ========================================
-- Migration completed successfully
-- ========================================

RAISE NOTICE 'Subscription cycle tracking schema migration completed successfully!';
RAISE NOTICE 'Added cycle tracking to subscriptions table';
RAISE NOTICE 'Created subscription_cycles table for history tracking';
RAISE NOTICE 'Updated queue_orders table for cycle alignment';  
RAISE NOTICE 'Created 4 subscription timeline views';
RAISE NOTICE 'Added 3 cycle management functions';
RAISE NOTICE 'Populated initial cycle data for existing subscriptions'; 