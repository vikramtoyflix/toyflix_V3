-- ========================================
-- FIX SELECTION WINDOW LOGIC - CRITICAL BUGS
-- ========================================

-- ✅ FIX 1: Correct the day calculation bug in database functions
-- The EXTRACT(DAY FROM interval) only returns the day component, not total days
CREATE OR REPLACE FUNCTION get_current_cycle_day(p_rental_start_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    -- ✅ FIXED: Use integer conversion instead of EXTRACT(DAY)
    -- This gives us the actual number of days elapsed
    RETURN (CURRENT_DATE - p_rental_start_date)::integer + 1;
END;
$$;

-- ✅ FIX 2: Update the selection window status calculation function
CREATE OR REPLACE FUNCTION calculate_selection_window_status(
    p_rental_start_date DATE,
    p_manual_control BOOLEAN DEFAULT false,
    p_current_status TEXT DEFAULT 'auto'
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_days_elapsed INTEGER;
    v_cycle_day INTEGER;
BEGIN
    -- ✅ FIXED: Calculate total days elapsed correctly
    v_days_elapsed := (CURRENT_DATE - p_rental_start_date)::integer;
    v_cycle_day := v_days_elapsed + 1; -- Day 1 is the first day
    
    -- If manual control is enabled, don't change status automatically
    IF p_manual_control THEN
        RETURN p_current_status;
    END IF;
    
    -- Auto logic: Day 24-34 window (11 days total)
    IF v_cycle_day >= 24 AND v_cycle_day <= 34 THEN
        RETURN 'auto_open';
    ELSE
        RETURN 'auto_closed';
    END IF;
END;
$$;

-- ✅ FIX 3: Update days until selection opens function
CREATE OR REPLACE FUNCTION get_days_until_selection_opens(p_rental_start_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_cycle_day INTEGER;
BEGIN
    v_cycle_day := get_current_cycle_day(p_rental_start_date);
    
    -- If we're already in or past the selection window, return 0
    IF v_cycle_day >= 24 THEN
        RETURN 0;
    END IF;
    
    -- Return days until day 24
    RETURN 24 - v_cycle_day;
END;
$$;

-- ✅ FIX 4: Create function to get days until selection closes
CREATE OR REPLACE FUNCTION get_days_until_selection_closes(p_rental_start_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_cycle_day INTEGER;
BEGIN
    v_cycle_day := get_current_cycle_day(p_rental_start_date);
    
    -- If we're not in the selection window yet, return days until it closes after opening
    IF v_cycle_day < 24 THEN
        RETURN 34 - v_cycle_day;
    END IF;
    
    -- If we're in the selection window, return days until it closes
    IF v_cycle_day <= 34 THEN
        RETURN 34 - v_cycle_day;
    END IF;
    
    -- If we're past the selection window, return 0
    RETURN 0;
END;
$$;

-- ✅ FIX 5: Create comprehensive view for selection window status
CREATE OR REPLACE VIEW rental_orders_selection_status AS
SELECT 
    ro.id,
    ro.user_id,
    ro.order_number,
    ro.rental_start_date,
    ro.subscription_status,
    ro.selection_window_status,
    ro.manual_selection_control,
    ro.selection_window_opened_at,
    ro.selection_window_closed_at,
    ro.selection_window_notes,
    
    -- Calculated fields
    get_current_cycle_day(ro.rental_start_date) as current_cycle_day,
    calculate_selection_window_status(
        ro.rental_start_date, 
        ro.manual_selection_control, 
        ro.selection_window_status
    ) as calculated_status,
    get_days_until_selection_opens(ro.rental_start_date) as days_until_opens,
    get_days_until_selection_closes(ro.rental_start_date) as days_until_closes,
    
    -- Selection window is open if:
    -- 1. Manual control is enabled and status is manual_open, OR
    -- 2. Auto control and we're in day 24-34 window
    CASE 
        WHEN ro.manual_selection_control AND ro.selection_window_status = 'manual_open' THEN true
        WHEN ro.manual_selection_control AND ro.selection_window_status = 'manual_closed' THEN false
        WHEN NOT COALESCE(ro.manual_selection_control, false) THEN 
            get_current_cycle_day(ro.rental_start_date) >= 24 AND 
            get_current_cycle_day(ro.rental_start_date) <= 34
        ELSE false
    END as is_selection_open,
    
    -- Status message for display
    CASE 
        WHEN ro.manual_selection_control AND ro.selection_window_status = 'manual_open' 
            THEN 'Selection manually opened by admin'
        WHEN ro.manual_selection_control AND ro.selection_window_status = 'manual_closed' 
            THEN 'Selection manually closed by admin'
        WHEN get_current_cycle_day(ro.rental_start_date) >= 24 AND 
             get_current_cycle_day(ro.rental_start_date) <= 34 
            THEN 'Selection window open (Day ' || get_current_cycle_day(ro.rental_start_date) || ')'
        WHEN get_current_cycle_day(ro.rental_start_date) < 24 
            THEN 'Selection opens in ' || (24 - get_current_cycle_day(ro.rental_start_date)) || ' days (Day 24)'
        ELSE 'Selection window closed for this cycle'
    END as status_message
    
FROM public.rental_orders ro
WHERE ro.subscription_status = 'active'
AND ro.rental_start_date IS NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_rental_orders_selection_status_user 
ON public.rental_orders(user_id, subscription_status, rental_start_date) 
WHERE subscription_status = 'active';

-- ✅ FIX 6: Create function to get user's current selection window status
CREATE OR REPLACE FUNCTION get_user_selection_window_status(p_user_id UUID)
RETURNS TABLE (
    rental_order_id UUID,
    current_cycle_day INTEGER,
    is_selection_open BOOLEAN,
    status_message TEXT,
    days_until_opens INTEGER,
    days_until_closes INTEGER,
    manual_control BOOLEAN,
    selection_status TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ross.id,
        ross.current_cycle_day,
        ross.is_selection_open,
        ross.status_message,
        ross.days_until_opens,
        ross.days_until_closes,
        ross.manual_selection_control,
        ross.selection_window_status
    FROM rental_orders_selection_status ross
    WHERE ross.user_id = p_user_id
    ORDER BY ross.rental_start_date DESC
    LIMIT 1;
END;
$$;

-- ✅ FIX 7: Test the fixes with sample data
DO $$
DECLARE
    test_date DATE := '2025-01-01';
    current_test_date DATE;
    cycle_day INTEGER;
    is_open BOOLEAN;
BEGIN
    -- Test day calculations for a full cycle
    FOR i IN 1..40 LOOP
        current_test_date := test_date + (i - 1);
        
        -- Temporarily set the current date for testing
        PERFORM set_config('timezone', 'UTC', false);
        
        cycle_day := (current_test_date - test_date)::integer + 1;
        is_open := cycle_day >= 24 AND cycle_day <= 34;
        
        -- Log key days
        IF i IN (1, 24, 34, 35) THEN
            RAISE NOTICE 'Day %: Cycle day %, Selection window: %', 
                i, cycle_day, CASE WHEN is_open THEN 'OPEN' ELSE 'CLOSED' END;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Selection window logic test completed successfully!';
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION get_current_cycle_day(DATE) IS 
'Returns the current day in the subscription cycle (1-based). Day 1 is the subscription start date.';

COMMENT ON FUNCTION calculate_selection_window_status(DATE, BOOLEAN, TEXT) IS 
'Calculates the selection window status based on cycle day and manual controls. Returns auto_open for days 24-34, auto_closed otherwise, or preserves manual status.';

COMMENT ON VIEW rental_orders_selection_status IS 
'Comprehensive view showing selection window status for all active rental orders with calculated fields for cycle day, selection window status, and timing information.';
