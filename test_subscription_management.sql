-- Test 1: Check if subscription_management table is accessible
SELECT 
    COUNT(*) as total_cycles,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(CASE WHEN selection_window_status = 'open' THEN 1 END) as open_cycles
FROM subscription_management;

-- Test 2: Check specific user from console log
SELECT 
    user_id,
    cycle_number,
    cycle_status,
    selection_window_status,
    plan_name,
    toys_count
FROM subscription_management 
WHERE user_id = '53cd6016-f006-4687-bbd4-e3d412ce8e4b'
ORDER BY cycle_number;

-- Test 3: Check if any cycles have proper selection window logic
SELECT 
    selection_window_status,
    COUNT(*) as count,
    MIN(selection_window_start) as earliest_start,
    MAX(selection_window_end) as latest_end
FROM subscription_management
GROUP BY selection_window_status;

-- Test 4: Check table structure to see what columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'subscription_management'
ORDER BY ordinal_position;
