-- =====================================
-- SUBSCRIPTION SYSTEM HEALTH CHECK
-- =====================================

-- 1. Overall cycle distribution
SELECT 
    'Cycle Distribution' as check_type,
    cycle_number,
    COUNT(*) as count,
    cycle_status,
    selection_window_status
FROM subscription_management 
GROUP BY cycle_number, cycle_status, selection_window_status
ORDER BY cycle_number, cycle_status;

-- 2. Selection window status summary
SELECT 
    'Selection Windows' as check_type,
    selection_window_status,
    COUNT(*) as total_cycles,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM subscription_management), 2) as percentage
FROM subscription_management 
GROUP BY selection_window_status
ORDER BY total_cycles DESC;

-- 3. Plan distribution across cycles
SELECT 
    'Plan Distribution' as check_type,
    plan_name,
    COUNT(*) as total_cycles,
    COUNT(*) / 6 as subscriptions
FROM subscription_management 
GROUP BY plan_name
ORDER BY total_cycles DESC;

-- 4. Users ready for immediate testing (open selection windows)
SELECT 
    'Ready for Testing' as check_type,
    cu.email,
    cu.first_name,
    sm.cycle_number,
    sm.plan_name,
    sm.toys_count,
    sm.selection_window_end
FROM subscription_management sm
JOIN custom_users cu ON sm.user_id = cu.id
WHERE sm.selection_window_status = 'open'
ORDER BY sm.selection_window_end ASC
LIMIT 5;

-- 5. System integrity check
SELECT 
    'Integrity Check' as check_type,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT subscription_id) as unique_subscriptions,
    COUNT(*) as total_cycles,
    COUNT(*) / COUNT(DISTINCT user_id) as avg_cycles_per_user
FROM subscription_management;

