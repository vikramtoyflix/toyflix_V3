-- Debug Selection Windows Issue
-- Run this to see what's actually in the database

-- 1. Check all rental orders with selection window data
SELECT 
    ro.id,
    ro.user_id,
    ro.order_number,
    ro.subscription_status,
    ro.selection_window_status,
    ro.manual_selection_control,
    ro.selection_window_opened_at,
    ro.selection_window_closed_at,
    ro.selection_window_notes,
    cu.first_name,
    cu.last_name,
    cu.phone
FROM public.rental_orders ro
LEFT JOIN public.custom_users cu ON ro.user_id = cu.id
WHERE ro.subscription_status = 'active'
ORDER BY ro.selection_window_status, ro.manual_selection_control;

-- 2. Count by selection window status
SELECT 
    selection_window_status,
    manual_selection_control,
    COUNT(*) as count
FROM public.rental_orders
WHERE subscription_status = 'active'
GROUP BY selection_window_status, manual_selection_control
ORDER BY selection_window_status, manual_selection_control;

-- 3. Test the function directly
SELECT * FROM get_manual_selection_windows_count();

-- 4. Check for any manually controlled windows (regardless of status)
SELECT 
    ro.id,
    ro.user_id,
    ro.order_number,
    ro.selection_window_status,
    ro.manual_selection_control,
    ro.selection_window_opened_at,
    CONCAT(COALESCE(cu.first_name, ''), ' ', COALESCE(cu.last_name, '')) as user_name,
    cu.phone
FROM public.rental_orders ro
LEFT JOIN public.custom_users cu ON ro.user_id = cu.id
WHERE ro.subscription_status = 'active'
AND ro.manual_selection_control = true
ORDER BY ro.selection_window_status;

-- 5. Check if there are any windows that should be considered "manually opened"
-- This includes both 'manual_open' and any manual control that's currently open
SELECT 
    ro.id,
    ro.user_id,
    ro.order_number,
    ro.selection_window_status,
    ro.manual_selection_control,
    ro.selection_window_opened_at,
    EXTRACT(DAY FROM (CURRENT_DATE - ro.rental_start_date)) + 1 as cycle_day,
    CASE 
        WHEN ro.manual_selection_control = true AND ro.selection_window_status = 'manual_open' THEN 'Manual Open'
        WHEN ro.manual_selection_control = true AND ro.selection_window_status = 'manual_closed' THEN 'Manual Closed'
        WHEN ro.manual_selection_control = false AND EXTRACT(DAY FROM (CURRENT_DATE - ro.rental_start_date)) + 1 BETWEEN 24 AND 34 THEN 'Auto Open'
        ELSE 'Closed/Other'
    END as effective_status,
    CONCAT(COALESCE(cu.first_name, ''), ' ', COALESCE(cu.last_name, '')) as user_name
FROM public.rental_orders ro
LEFT JOIN public.custom_users cu ON ro.user_id = cu.id
WHERE ro.subscription_status = 'active'
ORDER BY effective_status, ro.selection_window_status;
