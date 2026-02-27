-- Fix the create_subscription_cycle function - proper date arithmetic
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
    
    -- Calculate cycle dates (FIXED - proper date arithmetic)
    v_cycle_start := (v_subscription.subscription_start_date + (v_cycle_number - 1) * INTERVAL '30 days')::DATE;
    v_cycle_end := (v_cycle_start + INTERVAL '29 days')::DATE;
    v_selection_start := (v_cycle_start + INTERVAL '23 days')::DATE;
    v_selection_end := (v_cycle_start + INTERVAL '29 days')::DATE;
    
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
            'created_at', v_subscription.created_at
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
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = p_subscription_id;
    END IF;
    
    RETURN v_cycle_id;
END;
$$; 