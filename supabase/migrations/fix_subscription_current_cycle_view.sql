-- Fix the subscription_current_cycle view with proper date arithmetic
-- Replace EXTRACT with proper interval handling

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
    
    -- Current cycle progress (using proper interval arithmetic)
    CASE 
        WHEN s.cycle_start_date IS NOT NULL AND s.cycle_end_date IS NOT NULL THEN
            ROUND(
                (DATE_PART('day', CURRENT_DATE - s.cycle_start_date)::NUMERIC / 
                 DATE_PART('day', s.cycle_end_date - s.cycle_start_date)::NUMERIC) * 100, 2
            )
        ELSE 0
    END as cycle_progress_percentage,
    
    -- Days in current cycle (using proper date arithmetic)
    CASE 
        WHEN s.cycle_start_date IS NOT NULL THEN
            (CURRENT_DATE - s.cycle_start_date)::INTEGER + 1
        ELSE 1
    END as current_day_in_cycle,
    
    -- Days remaining in cycle (using proper date arithmetic)
    CASE 
        WHEN s.cycle_end_date IS NOT NULL THEN
            (s.cycle_end_date - CURRENT_DATE)::INTEGER
        ELSE 30
    END as days_remaining_in_cycle,
    
    -- Selection window status
    CASE 
        WHEN s.next_selection_window_start IS NOT NULL AND s.next_selection_window_end IS NOT NULL AND
             CURRENT_DATE BETWEEN s.next_selection_window_start AND s.next_selection_window_end THEN 'open'
        WHEN s.next_selection_window_start IS NOT NULL AND
             CURRENT_DATE < s.next_selection_window_start THEN 'upcoming'
        ELSE 'closed'
    END as selection_window_status,
    
    -- Days until/since selection window (using proper date arithmetic)
    CASE 
        WHEN s.next_selection_window_start IS NOT NULL AND CURRENT_DATE < s.next_selection_window_start THEN
            (s.next_selection_window_start - CURRENT_DATE)::INTEGER
        WHEN s.next_selection_window_end IS NOT NULL AND CURRENT_DATE > s.next_selection_window_end THEN
            -((CURRENT_DATE - s.next_selection_window_end)::INTEGER)
        ELSE 0
    END as days_to_selection_window,
    
    s.subscription_start_date,
    CASE 
        WHEN s.subscription_start_date IS NOT NULL THEN
            (CURRENT_DATE - s.subscription_start_date)::INTEGER
        ELSE 0
    END as total_days_subscribed,
    s.created_at,
    s.updated_at
FROM public.subscriptions s
WHERE s.status IN ('active', 'paused'); 