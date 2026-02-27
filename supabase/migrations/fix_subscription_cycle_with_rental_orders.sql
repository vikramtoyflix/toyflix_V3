-- ========================================
-- FIX SUBSCRIPTION CYCLE TRACKING WITH RENTAL ORDERS
-- Use rental_orders.rental_start_date as the actual subscription start date
-- ========================================

-- ========================================
-- STEP 1: Create helper function to get actual subscription start date
-- ========================================

CREATE OR REPLACE FUNCTION get_actual_subscription_start_date(p_subscription_id UUID)
RETURNS DATE
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_rental_start_date DATE;
    v_subscription_start_date DATE;
BEGIN
    -- Get the earliest rental_start_date for this subscription
    SELECT MIN(rental_start_date) INTO v_rental_start_date
    FROM public.rental_orders
    WHERE subscription_id = p_subscription_id
    AND rental_start_date IS NOT NULL;
    
    -- If no rental orders found, fall back to subscription start_date
    IF v_rental_start_date IS NULL THEN
        SELECT start_date INTO v_subscription_start_date
        FROM public.subscriptions
        WHERE id = p_subscription_id;
        
        RETURN COALESCE(v_subscription_start_date, CURRENT_DATE);
    END IF;
    
    RETURN v_rental_start_date;
END;
$$;

-- ========================================
-- STEP 2: Create function to get user's actual subscription start date
-- ========================================

CREATE OR REPLACE FUNCTION get_user_actual_subscription_start_date(p_user_id UUID)
RETURNS DATE
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_rental_start_date DATE;
    v_subscription_start_date DATE;
BEGIN
    -- Get the earliest rental_start_date for this user
    SELECT MIN(rental_start_date) INTO v_rental_start_date
    FROM public.rental_orders
    WHERE user_id = p_user_id
    AND rental_start_date IS NOT NULL;
    
    -- If no rental orders found, fall back to subscription start_date
    IF v_rental_start_date IS NULL THEN
        SELECT MIN(start_date) INTO v_subscription_start_date
        FROM public.subscriptions
        WHERE user_id = p_user_id;
        
        RETURN COALESCE(v_subscription_start_date, CURRENT_DATE);
    END IF;
    
    RETURN v_rental_start_date;
END;
$$;

-- ========================================
-- STEP 3: Drop and recreate views with proper rental-based calculations
-- ========================================

-- Drop views in reverse dependency order
DROP VIEW IF EXISTS public.subscription_selection_windows CASCADE;
DROP VIEW IF EXISTS public.subscription_cycle_history CASCADE;
DROP VIEW IF EXISTS public.subscription_upcoming_cycles CASCADE;
DROP VIEW IF EXISTS public.subscription_current_cycle CASCADE;

-- ========================================
-- STEP 4: Create updated subscription_current_cycle view
-- ========================================

CREATE VIEW public.subscription_current_cycle AS
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
    
    -- Use actual service start date from rental_orders
    get_actual_subscription_start_date(s.id) as actual_subscription_start_date,
    get_user_actual_subscription_start_date(s.user_id) as user_actual_start_date,
    
    -- Current cycle progress (based on actual rental start date)
    CASE 
        WHEN s.cycle_start_date IS NOT NULL AND s.cycle_end_date IS NOT NULL 
             AND s.cycle_end_date > s.cycle_start_date THEN
            ROUND(
                (DATE_PART('day', AGE(CURRENT_DATE::timestamp, s.cycle_start_date::timestamp))::NUMERIC / 
                 DATE_PART('day', AGE(s.cycle_end_date::timestamp, s.cycle_start_date::timestamp))::NUMERIC) * 100, 2
            )
        ELSE 0::NUMERIC
    END as cycle_progress_percentage,
    
    -- Days in current cycle (based on actual rental start date)
    CASE 
        WHEN s.cycle_start_date IS NOT NULL THEN
            DATE_PART('day', AGE(CURRENT_DATE::timestamp, s.cycle_start_date::timestamp))::INTEGER + 1
        ELSE 
            DATE_PART('day', AGE(CURRENT_DATE::timestamp, get_actual_subscription_start_date(s.id)::timestamp))::INTEGER + 1
    END as current_day_in_cycle,
    
    -- Days remaining in cycle
    CASE 
        WHEN s.cycle_end_date IS NOT NULL THEN
            DATE_PART('day', AGE(s.cycle_end_date::timestamp, CURRENT_DATE::timestamp))::INTEGER
        ELSE 30::INTEGER
    END as days_remaining_in_cycle,
    
    -- Selection window status
    CASE 
        WHEN s.next_selection_window_start IS NOT NULL AND s.next_selection_window_end IS NOT NULL AND
             CURRENT_DATE BETWEEN s.next_selection_window_start AND s.next_selection_window_end THEN 'open'::TEXT
        WHEN s.next_selection_window_start IS NOT NULL AND
             CURRENT_DATE < s.next_selection_window_start THEN 'upcoming'::TEXT
        ELSE 'closed'::TEXT
    END as selection_window_status,
    
    -- Days until/since selection window
    CASE 
        WHEN s.next_selection_window_start IS NOT NULL AND CURRENT_DATE < s.next_selection_window_start THEN
            DATE_PART('day', AGE(s.next_selection_window_start::timestamp, CURRENT_DATE::timestamp))::INTEGER
        WHEN s.next_selection_window_end IS NOT NULL AND CURRENT_DATE > s.next_selection_window_end THEN
            -(DATE_PART('day', AGE(CURRENT_DATE::timestamp, s.next_selection_window_end::timestamp))::INTEGER)
        ELSE 0::INTEGER
    END as days_to_selection_window,
    
    -- Original subscription start date vs actual rental start date
    s.start_date as original_subscription_date,
    CASE 
        WHEN get_actual_subscription_start_date(s.id) IS NOT NULL THEN
            DATE_PART('day', AGE(CURRENT_DATE::timestamp, get_actual_subscription_start_date(s.id)::timestamp))::INTEGER
        ELSE 0::INTEGER
    END as total_days_subscribed_actual,
    
    -- Rental orders count for this subscription
    (SELECT COUNT(*) FROM public.rental_orders WHERE subscription_id = s.id) as rental_orders_count,
    
    s.created_at,
    s.updated_at
FROM public.subscriptions s
WHERE s.status IN ('active', 'paused');

-- ========================================
-- STEP 5: Create updated subscription_upcoming_cycles view (FIXED)
-- ========================================

CREATE VIEW public.subscription_upcoming_cycles AS
SELECT 
    s.id as subscription_id,
    s.user_id,
    s.plan_id,
    s.cycle_number + cycle_offset.cycle_num as future_cycle_number,
    
    -- Calculate future cycles based on actual rental start date
    CASE 
        WHEN s.cycle_end_date IS NOT NULL THEN
            s.cycle_end_date + ((cycle_offset.cycle_num - 1) * INTERVAL '30 days')
        ELSE
            get_actual_subscription_start_date(s.id) + ((s.cycle_number + cycle_offset.cycle_num - 1) * INTERVAL '30 days')
    END as future_cycle_start,
    
    CASE 
        WHEN s.cycle_end_date IS NOT NULL THEN
            s.cycle_end_date + (cycle_offset.cycle_num * INTERVAL '30 days')
        ELSE
            get_actual_subscription_start_date(s.id) + ((s.cycle_number + cycle_offset.cycle_num) * INTERVAL '30 days')
    END as future_cycle_end,
    
    -- Selection windows based on actual rental dates
    CASE 
        WHEN s.cycle_end_date IS NOT NULL THEN
            s.cycle_end_date + ((cycle_offset.cycle_num - 1) * INTERVAL '30 days') + INTERVAL '23 days'
        ELSE
            get_actual_subscription_start_date(s.id) + ((s.cycle_number + cycle_offset.cycle_num - 1) * INTERVAL '30 days') + INTERVAL '23 days'
    END as future_selection_start,
    
    CASE 
        WHEN s.cycle_end_date IS NOT NULL THEN
            s.cycle_end_date + ((cycle_offset.cycle_num - 1) * INTERVAL '30 days') + INTERVAL '29 days'
        ELSE
            get_actual_subscription_start_date(s.id) + ((s.cycle_number + cycle_offset.cycle_num - 1) * INTERVAL '30 days') + INTERVAL '29 days'
    END as future_selection_end,
    
    -- Estimated delivery dates
    CASE 
        WHEN s.cycle_end_date IS NOT NULL THEN
            s.cycle_end_date + (cycle_offset.cycle_num * INTERVAL '30 days') + INTERVAL '1 day'
        ELSE
            get_actual_subscription_start_date(s.id) + ((s.cycle_number + cycle_offset.cycle_num) * INTERVAL '30 days') + INTERVAL '1 day'
    END as estimated_delivery_date,
    
    -- Include actual start date for reference
    get_actual_subscription_start_date(s.id) as actual_subscription_start_date
FROM public.subscriptions s
CROSS JOIN LATERAL (SELECT generate_series(1, 6) as cycle_num) as cycle_offset
WHERE s.status = 'active';

-- ========================================
-- STEP 6: Create updated subscription_cycle_history view
-- ========================================

CREATE VIEW public.subscription_cycle_history AS
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
    DATE_PART('day', AGE(sc.cycle_end_date::timestamp, sc.cycle_start_date::timestamp))::INTEGER as cycle_duration_days,
    
    -- Selection window duration
    DATE_PART('day', AGE(sc.selection_window_end::timestamp, sc.selection_window_start::timestamp))::INTEGER as selection_window_duration,
    
    -- Delivery performance
    CASE 
        WHEN sc.delivery_actual_date IS NOT NULL AND sc.delivery_scheduled_date IS NOT NULL THEN
            DATE_PART('day', AGE(sc.delivery_actual_date::timestamp, sc.delivery_scheduled_date::timestamp))::INTEGER
        ELSE NULL
    END as delivery_delay_days,
    
    -- Cycle completion metrics
    CASE 
        WHEN sc.completed_at IS NOT NULL THEN
            DATE_PART('day', AGE(sc.completed_at, sc.cycle_start_date::timestamp))::INTEGER
        ELSE NULL
    END as cycle_completion_days,
    
    -- Link to rental orders for this cycle
    (SELECT COUNT(*) FROM public.rental_orders ro 
     WHERE ro.subscription_id = sc.subscription_id 
     AND ro.cycle_number = sc.cycle_number) as rental_orders_count,
    
    -- Get actual rental start date for this cycle
    (SELECT MIN(rental_start_date) FROM public.rental_orders ro 
     WHERE ro.subscription_id = sc.subscription_id 
     AND ro.cycle_number = sc.cycle_number) as actual_rental_start_date,
    
    sc.created_at,
    sc.updated_at
FROM public.subscription_cycles sc
ORDER BY sc.subscription_id, sc.cycle_number DESC;

-- ========================================
-- STEP 7: Create updated subscription_selection_windows view
-- ========================================

CREATE VIEW public.subscription_selection_windows AS
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
        WHEN CURRENT_DATE < sc.selection_window_start THEN 'upcoming'::TEXT
        WHEN CURRENT_DATE BETWEEN sc.selection_window_start AND sc.selection_window_end THEN 'open'::TEXT
        WHEN CURRENT_DATE > sc.selection_window_end AND sc.toys_selected_at IS NULL THEN 'missed'::TEXT
        WHEN sc.toys_selected_at IS NOT NULL THEN 'completed'::TEXT
        ELSE 'closed'::TEXT
    END as window_status,
    
    -- Time calculations
    CASE 
        WHEN CURRENT_DATE < sc.selection_window_start THEN
            DATE_PART('day', AGE(sc.selection_window_start::timestamp, CURRENT_DATE::timestamp))::INTEGER
        ELSE 0::INTEGER
    END as days_until_opens,
    
    CASE 
        WHEN CURRENT_DATE BETWEEN sc.selection_window_start AND sc.selection_window_end THEN
            DATE_PART('day', AGE(sc.selection_window_end::timestamp, CURRENT_DATE::timestamp))::INTEGER
        ELSE 0::INTEGER
    END as days_until_closes,
    
    -- Selection performance
    CASE 
        WHEN sc.toys_selected_at IS NOT NULL AND sc.selection_window_start IS NOT NULL THEN
            DATE_PART('day', AGE(sc.toys_selected_at, sc.selection_window_start::timestamp))::INTEGER
        ELSE NULL
    END as days_to_select,
    
    -- Rental orders for this cycle
    (SELECT COUNT(*) FROM public.rental_orders ro 
     WHERE ro.subscription_id = sc.subscription_id 
     AND ro.cycle_number = sc.cycle_number) as rental_orders_count,
    
    sc.created_at,
    sc.updated_at
FROM public.subscription_cycles sc
WHERE sc.cycle_status IN ('upcoming', 'active', 'selection_open', 'selection_closed')
ORDER BY sc.subscription_id, sc.cycle_number;

-- ========================================
-- STEP 8: Update subscription cycle creation function
-- ========================================

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
    v_actual_start_date DATE;
BEGIN
    -- Get subscription details
    SELECT * INTO v_subscription
    FROM public.subscriptions 
    WHERE id = p_subscription_id AND status IN ('active', 'paused');
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active subscription not found: %', p_subscription_id;
    END IF;
    
    -- Get actual subscription start date from rental orders
    v_actual_start_date := get_actual_subscription_start_date(p_subscription_id);
    
    -- Determine cycle number
    v_cycle_number := COALESCE(p_cycle_number, v_subscription.cycle_number + 1);
    
    -- Calculate cycle dates based on actual rental start date
    v_cycle_start := (v_actual_start_date + (v_cycle_number - 1) * INTERVAL '30 days')::DATE;
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
            'subscription_type', COALESCE(v_subscription.subscription_type, 'monthly'),
            'created_at', v_subscription.created_at,
            'actual_start_date', v_actual_start_date,
            'original_start_date', v_subscription.start_date
        ),
        (v_cycle_end + INTERVAL '1 day')::DATE,
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
            -- Update subscription_start_date to actual rental start date
            subscription_start_date = v_actual_start_date,
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = p_subscription_id;
    END IF;
    
    RETURN v_cycle_id;
END;
$$;

-- ========================================
-- STEP 9: Update existing subscription records with actual start dates
-- ========================================

-- Update subscription_start_date field with actual rental start dates
UPDATE public.subscriptions s
SET 
    subscription_start_date = get_actual_subscription_start_date(s.id),
    updated_at = TIMEZONE('utc'::text, NOW())
WHERE id IN (
    SELECT DISTINCT s.id 
    FROM public.subscriptions s
    JOIN public.rental_orders ro ON s.id = ro.subscription_id
    WHERE ro.rental_start_date IS NOT NULL
    AND s.subscription_start_date != get_actual_subscription_start_date(s.id)
);

-- ========================================
-- STEP 10: Restore permissions
-- ========================================

GRANT SELECT ON public.subscription_current_cycle TO authenticated;
GRANT SELECT ON public.subscription_cycle_history TO authenticated;
GRANT SELECT ON public.subscription_upcoming_cycles TO authenticated;
GRANT SELECT ON public.subscription_selection_windows TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_actual_subscription_start_date(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_actual_subscription_start_date(UUID) TO authenticated;

-- ========================================
-- STEP 11: Create validation view
-- ========================================

CREATE VIEW public.subscription_start_date_comparison AS
SELECT 
    s.id as subscription_id,
    s.user_id,
    s.start_date as original_subscription_date,
    s.subscription_start_date as stored_subscription_start_date,
    get_actual_subscription_start_date(s.id) as actual_rental_start_date,
    (SELECT MIN(rental_start_date) FROM public.rental_orders WHERE subscription_id = s.id) as earliest_rental_date,
    (SELECT COUNT(*) FROM public.rental_orders WHERE subscription_id = s.id) as rental_orders_count,
    DATE_PART('day', AGE(s.start_date::timestamp, get_actual_subscription_start_date(s.id)::timestamp))::INTEGER as date_difference_days
FROM public.subscriptions s
WHERE s.status IN ('active', 'paused')
ORDER BY s.user_id, s.created_at;

GRANT SELECT ON public.subscription_start_date_comparison TO authenticated;

-- ========================================
-- STEP 12: Add helpful comments
-- ========================================

COMMENT ON FUNCTION public.get_actual_subscription_start_date(UUID) IS 'Returns the actual subscription start date based on rental_orders.rental_start_date';
COMMENT ON FUNCTION public.get_user_actual_subscription_start_date(UUID) IS 'Returns the users actual subscription start date based on earliest rental_start_date';
COMMENT ON VIEW public.subscription_start_date_comparison IS 'Compares subscription registration dates vs actual rental start dates';
COMMENT ON VIEW public.subscription_current_cycle IS 'Current cycle status using actual rental start dates for accurate tracking';

-- ========================================
-- Migration completed successfully
-- ========================================

RAISE NOTICE '=== SUBSCRIPTION CYCLE RENTAL INTEGRATION COMPLETED ===';
RAISE NOTICE 'Updated subscription cycle tracking to use rental_orders.rental_start_date';
RAISE NOTICE 'Created helper functions for actual subscription start dates';
RAISE NOTICE 'Updated all views to use actual rental start dates';
RAISE NOTICE 'Updated existing subscription records with actual start dates';
RAISE NOTICE 'Created validation view for comparing dates';
RAISE NOTICE 'Subscription cycle tracking now reflects actual service delivery dates'; 