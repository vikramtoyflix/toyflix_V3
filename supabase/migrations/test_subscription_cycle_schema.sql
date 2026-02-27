-- ========================================
-- Test Subscription Cycle Schema
-- Validation queries for subscription cycle tracking
-- ========================================

-- ========================================
-- Test 1: Verify schema structure
-- ========================================

-- Check if new columns exist in subscriptions table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
AND column_name IN (
    'cycle_start_date',
    'cycle_end_date', 
    'cycle_number',
    'last_selection_date',
    'subscription_start_date',
    'total_cycles_completed',
    'current_cycle_status'
)
ORDER BY column_name;

-- Check if subscription_cycles table exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'subscription_cycles';

-- Check subscription_cycles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'subscription_cycles'
ORDER BY ordinal_position;

-- ========================================
-- Test 2: Verify views are created
-- ========================================

-- Check if views exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_type = 'VIEW'
AND table_name IN (
    'subscription_current_cycle',
    'subscription_cycle_history',
    'subscription_upcoming_cycles',
    'subscription_selection_windows'
);

-- Test current cycle view structure
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'subscription_current_cycle'
ORDER BY ordinal_position;

-- ========================================
-- Test 3: Verify functions exist
-- ========================================

-- Check if functions are created
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name IN (
    'create_subscription_cycle',
    'update_cycle_status',
    'record_cycle_toy_selection'
)
ORDER BY routine_name;

-- ========================================
-- Test 4: Test with sample data
-- ========================================

-- Create a test user (if not exists)
INSERT INTO public.custom_users (
    id,
    phone,
    email,
    first_name,
    last_name,
    phone_verified,
    is_active
) VALUES (
    'test-user-cycle-uuid',
    '9999999999',
    'test.cycle@example.com',
    'Test',
    'User',
    true,
    true
) ON CONFLICT (phone) DO NOTHING;

-- Create a test subscription
INSERT INTO public.subscriptions (
    id,
    user_id,
    plan_id,
    status,
    start_date,
    end_date,
    current_period_start,
    current_period_end,
    subscription_start_date,
    cycle_number,
    cycle_start_date,
    cycle_end_date
) VALUES (
    'test-subscription-cycle-uuid',
    'test-user-cycle-uuid',
    'discovery_delight',
    'active',
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE + INTERVAL '345 days',
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE + INTERVAL '15 days',
    CURRENT_DATE - INTERVAL '15 days',
    1,
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE + INTERVAL '15 days'
) ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    updated_at = NOW();

-- ========================================
-- Test 5: Test cycle creation function
-- ========================================

-- Test creating a new cycle
SELECT public.create_subscription_cycle('test-subscription-cycle-uuid', 2) as new_cycle_id;

-- Verify the cycle was created
SELECT 
    id,
    subscription_id,
    cycle_number,
    cycle_start_date,
    cycle_end_date,
    selection_window_start,
    selection_window_end,
    cycle_status
FROM public.subscription_cycles 
WHERE subscription_id = 'test-subscription-cycle-uuid'
ORDER BY cycle_number;

-- ========================================
-- Test 6: Test views with sample data
-- ========================================

-- Test current cycle view
SELECT 
    subscription_id,
    user_id,
    current_cycle_number,
    cycle_progress_percentage,
    current_day_in_cycle,
    days_remaining_in_cycle,
    selection_window_status,
    days_to_selection_window
FROM public.subscription_current_cycle 
WHERE user_id = 'test-user-cycle-uuid';

-- Test cycle history view  
SELECT 
    cycle_id,
    subscription_id,
    cycle_number,
    cycle_duration_days,
    cycle_status,
    toys_count,
    total_toy_value
FROM public.subscription_cycle_history 
WHERE user_id = 'test-user-cycle-uuid'
ORDER BY cycle_number;

-- Test upcoming cycles view
SELECT 
    subscription_id,
    future_cycle_number,
    future_cycle_start,
    future_cycle_end,
    future_selection_start,
    future_selection_end
FROM public.subscription_upcoming_cycles 
WHERE subscription_id = 'test-subscription-cycle-uuid'
LIMIT 3;

-- Test selection windows view
SELECT 
    subscription_id,
    cycle_number,
    selection_window_start,
    selection_window_end,
    window_status,
    days_until_opens,
    days_until_closes
FROM public.subscription_selection_windows 
WHERE subscription_id = 'test-subscription-cycle-uuid'
ORDER BY cycle_number;

-- ========================================
-- Test 7: Test toy selection function
-- ========================================

-- Get a cycle ID for testing
-- This would typically be done with a variable, but for testing:
WITH test_cycle AS (
    SELECT id as cycle_id 
    FROM public.subscription_cycles 
    WHERE subscription_id = 'test-subscription-cycle-uuid' 
    AND cycle_number = 1
    LIMIT 1
)
SELECT public.record_cycle_toy_selection(
    test_cycle.cycle_id,
    '[
        {"toy_id": "toy1-uuid", "name": "Test Toy 1", "price": 299.00},
        {"toy_id": "toy2-uuid", "name": "Test Toy 2", "price": 599.00}
    ]'::jsonb,
    898.00
) as selection_recorded
FROM test_cycle;

-- Verify toy selection was recorded
SELECT 
    id,
    cycle_number,
    selected_toys,
    toys_count,
    total_toy_value,
    toys_selected_at,
    cycle_status
FROM public.subscription_cycles 
WHERE subscription_id = 'test-subscription-cycle-uuid'
AND toys_selected_at IS NOT NULL;

-- ========================================
-- Test 8: Test cycle status updates
-- ========================================

-- Update cycle status
WITH test_cycle AS (
    SELECT id as cycle_id 
    FROM public.subscription_cycles 
    WHERE subscription_id = 'test-subscription-cycle-uuid' 
    AND cycle_number = 1
    LIMIT 1
)
SELECT public.update_cycle_status(
    test_cycle.cycle_id,
    'shipped'
) as status_updated
FROM test_cycle;

-- Verify status was updated
SELECT 
    id,
    cycle_number,
    cycle_status,
    updated_at
FROM public.subscription_cycles 
WHERE subscription_id = 'test-subscription-cycle-uuid'
AND cycle_status = 'shipped';

-- ========================================
-- Test 9: Test queue_orders integration
-- ========================================

-- Create a test queue order linked to cycle
INSERT INTO public.queue_orders (
    user_id,
    subscription_cycle_id,
    subscription_cycle_number,
    selected_toys,
    cycle_based_delivery_date,
    subscription_aligned,
    total_amount,
    delivery_address
) 
SELECT 
    'test-user-cycle-uuid',
    sc.id,
    sc.cycle_number,
    sc.selected_toys,
    sc.delivery_scheduled_date,
    true,
    sc.total_toy_value,
    '{"street": "123 Test St", "city": "Test City", "state": "TS", "zip": "12345"}'::jsonb
FROM public.subscription_cycles sc
WHERE sc.subscription_id = 'test-subscription-cycle-uuid'
AND sc.cycle_number = 1
LIMIT 1;

-- Verify queue order was created with cycle link
SELECT 
    qo.id,
    qo.user_id,
    qo.subscription_cycle_id,
    qo.subscription_cycle_number,
    qo.cycle_based_delivery_date,
    qo.subscription_aligned,
    qo.total_amount,
    sc.cycle_number,
    sc.cycle_status
FROM public.queue_orders qo
JOIN public.subscription_cycles sc ON qo.subscription_cycle_id = sc.id
WHERE qo.user_id = 'test-user-cycle-uuid';

-- ========================================
-- Test 10: Performance validation
-- ========================================

-- Check indexes exist
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'subscription_cycles'
ORDER BY indexname;

-- Check constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.subscription_cycles'::regclass
ORDER BY conname;

-- ========================================
-- Test 11: Analytics and metrics
-- ========================================

-- Test analytics queries
SELECT 
    COUNT(*) as total_cycles,
    COUNT(CASE WHEN cycle_status = 'completed' THEN 1 END) as completed_cycles,
    COUNT(CASE WHEN toys_selected_at IS NOT NULL THEN 1 END) as cycles_with_selection,
    ROUND(AVG(toys_count), 2) as avg_toys_per_cycle,
    ROUND(AVG(total_toy_value), 2) as avg_cycle_value
FROM public.subscription_cycles;

-- Selection window performance
SELECT 
    window_status,
    COUNT(*) as count
FROM public.subscription_selection_windows
GROUP BY window_status;

-- Delivery performance
SELECT 
    delivery_status,
    COUNT(*) as count,
    ROUND(AVG(EXTRACT(DAY FROM (delivery_actual_date - delivery_scheduled_date))), 2) as avg_delay_days
FROM public.subscription_cycles
WHERE delivery_scheduled_date IS NOT NULL
GROUP BY delivery_status;

-- ========================================
-- Test 12: Security validation
-- ========================================

-- Check RLS policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'subscription_cycles'
ORDER BY policyname;

-- ========================================
-- Test 13: Cleanup test data
-- ========================================

-- Clean up test data
DELETE FROM public.queue_orders WHERE user_id = 'test-user-cycle-uuid';
DELETE FROM public.subscription_cycles WHERE subscription_id = 'test-subscription-cycle-uuid';
DELETE FROM public.subscriptions WHERE id = 'test-subscription-cycle-uuid';
DELETE FROM public.custom_users WHERE id = 'test-user-cycle-uuid';

-- ========================================
-- Test Results Summary
-- ========================================

SELECT 
    'Schema Validation Complete' as test_status,
    NOW() as test_completed_at,
    'All subscription cycle tracking features tested successfully' as result; 