-- Fix for Selection Windows Count Function
-- This addresses potential issues with the original function

-- Create improved function to get count of manually opened selection windows
CREATE OR REPLACE FUNCTION get_manual_selection_windows_count()
RETURNS TABLE (
    total_manual_open INTEGER,
    user_details JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
    v_details JSONB;
BEGIN
    -- Count manually opened selection windows
    -- Include both 'manual_open' status AND manual_selection_control = true with open status
    SELECT COUNT(*)
    INTO v_count
    FROM public.rental_orders ro
    WHERE ro.subscription_status = 'active'
    AND (
        -- Explicitly manual_open status
        (ro.selection_window_status = 'manual_open' AND ro.manual_selection_control = true)
        OR
        -- Manual control with open status (covers edge cases)
        (ro.manual_selection_control = true AND ro.selection_window_status IN ('manual_open', 'open'))
        OR
        -- Force open status (also manually controlled)
        (ro.selection_window_status = 'force_open')
    );
    
    -- Get user details for manually opened windows
    SELECT jsonb_agg(
        jsonb_build_object(
            'rental_order_id', ro.id,
            'user_id', ro.user_id,
            'user_name', CONCAT(COALESCE(cu.first_name, ''), ' ', COALESCE(cu.last_name, '')),
            'user_phone', cu.phone,
            'order_number', ro.order_number,
            'opened_at', ro.selection_window_opened_at,
            'cycle_day', EXTRACT(DAY FROM (CURRENT_DATE - ro.rental_start_date)) + 1,
            'subscription_plan', ro.subscription_plan,
            'window_status', ro.selection_window_status,
            'manual_control', ro.manual_selection_control
        )
    )
    INTO v_details
    FROM public.rental_orders ro
    JOIN public.custom_users cu ON ro.user_id = cu.id
    WHERE ro.subscription_status = 'active'
    AND (
        -- Explicitly manual_open status
        (ro.selection_window_status = 'manual_open' AND ro.manual_selection_control = true)
        OR
        -- Manual control with open status (covers edge cases)
        (ro.manual_selection_control = true AND ro.selection_window_status IN ('manual_open', 'open'))
        OR
        -- Force open status (also manually controlled)
        (ro.selection_window_status = 'force_open')
    );
    
    -- Return results
    RETURN QUERY SELECT 
        v_count,
        COALESCE(v_details, '[]'::jsonb);
END;
$$;

-- Also create a diagnostic function to see all selection window states
CREATE OR REPLACE FUNCTION debug_selection_window_states()
RETURNS TABLE (
    rental_order_id UUID,
    user_name TEXT,
    user_phone TEXT,
    order_number TEXT,
    selection_window_status TEXT,
    manual_selection_control BOOLEAN,
    cycle_day INTEGER,
    effective_status TEXT,
    should_be_counted BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ro.id,
        CONCAT(COALESCE(cu.first_name, ''), ' ', COALESCE(cu.last_name, '')) as user_name,
        cu.phone,
        ro.order_number,
        ro.selection_window_status,
        ro.manual_selection_control,
        EXTRACT(DAY FROM (CURRENT_DATE - ro.rental_start_date)) + 1::INTEGER as cycle_day,
        CASE 
            WHEN ro.manual_selection_control = true AND ro.selection_window_status = 'manual_open' THEN 'Manual Open'
            WHEN ro.manual_selection_control = true AND ro.selection_window_status = 'manual_closed' THEN 'Manual Closed'
            WHEN ro.manual_selection_control = true AND ro.selection_window_status = 'open' THEN 'Manual Open (legacy)'
            WHEN ro.selection_window_status = 'force_open' THEN 'Force Open'
            WHEN ro.manual_selection_control = false AND EXTRACT(DAY FROM (CURRENT_DATE - ro.rental_start_date)) + 1 BETWEEN 24 AND 34 THEN 'Auto Open'
            ELSE 'Closed/Other'
        END as effective_status,
        CASE 
            WHEN (ro.selection_window_status = 'manual_open' AND ro.manual_selection_control = true) THEN true
            WHEN (ro.manual_selection_control = true AND ro.selection_window_status IN ('manual_open', 'open')) THEN true
            WHEN (ro.selection_window_status = 'force_open') THEN true
            ELSE false
        END as should_be_counted
    FROM public.rental_orders ro
    LEFT JOIN public.custom_users cu ON ro.user_id = cu.id
    WHERE ro.subscription_status = 'active'
    ORDER BY should_be_counted DESC, effective_status, ro.selection_window_status;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION debug_selection_window_states() TO authenticated;

-- Test the functions
SELECT 'Testing improved count function:' as test;
SELECT * FROM get_manual_selection_windows_count();

SELECT 'Debugging all selection window states:' as test;
SELECT * FROM debug_selection_window_states();
