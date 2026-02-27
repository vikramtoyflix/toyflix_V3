-- =====================================
-- FINAL TEST: VERIFY CYCLE SYSTEM WORKS
-- =====================================

-- Test 1: Check specific user from console logs
SELECT 
    'User Cycle Test' as test_type,
    user_id,
    cycle_number,
    cycle_status,
    selection_window_status,
    plan_name,
    toys_count,
    selection_window_start,
    selection_window_end,
    CASE 
        WHEN selection_window_status = 'open' THEN 'TRUE'
        WHEN CURRENT_DATE BETWEEN selection_window_start AND selection_window_end THEN 'TRUE'
        ELSE 'FALSE'
    END as should_allow_selection
FROM subscription_management 
WHERE user_id = '53cd6016-f006-4687-bbd4-e3d412ce8e4b'
AND cycle_status = 'active'
ORDER BY cycle_number DESC
LIMIT 1;

-- Test 2: Verify table structure has required columns
SELECT 
    'Table Structure' as test_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'subscription_management'
AND column_name IN ('cycle_id', 'id', 'user_id', 'cycle_status', 'selection_window_status', 'plan_name', 'toys_count')
ORDER BY column_name;

-- Test 3: Count users with different selection statuses
SELECT 
    'Selection Status Distribution' as test_type,
    selection_window_status,
    COUNT(*) as count,
    COUNT(CASE WHEN cycle_status = 'active' THEN 1 END) as active_cycles
FROM subscription_management 
GROUP BY selection_window_status
ORDER BY count DESC;

