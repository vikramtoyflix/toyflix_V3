-- =====================================
-- MINIMAL SAFE MIGRATION (CORE COLUMNS ONLY)
-- =====================================

-- If the corrected migration still fails, try this minimal version first
-- to identify exactly which columns exist

-- Step 1: Test with absolute minimum required fields
INSERT INTO subscription_management (
    user_id,
    cycle_number,
    cycle_status,
    selection_window_start,
    selection_window_end,
    selection_window_status,
    created_at,
    updated_at
)
SELECT 
    ro.user_id,
    1,
    'active',
    (ro.rental_start_date::DATE + INTERVAL '19 days')::DATE,
    (ro.rental_start_date::DATE + INTERVAL '24 days')::DATE,
    'closed',
    ro.created_at,
    CURRENT_TIMESTAMP
FROM rental_orders ro
WHERE ro.subscription_status = 'active'
LIMIT 1; -- Test with just one record first

-- If above works, then add more fields incrementally:

-- Step 2: Add order relationship fields
-- INSERT INTO subscription_management (
--     user_id, order_id, subscription_id, cycle_number, cycle_status,
--     selection_window_start, selection_window_end, selection_window_status,
--     created_at, updated_at
-- ) SELECT ... FROM rental_orders ...

-- Step 3: Add toy fields
-- INSERT INTO subscription_management (
--     user_id, order_id, subscription_id, cycle_number, cycle_status,
--     selection_window_start, selection_window_end, selection_window_status,
--     selected_toys, toys_count,
--     created_at, updated_at
-- ) SELECT ... FROM rental_orders ...

-- Step 4: Add plan fields
-- INSERT INTO subscription_management (
--     user_id, order_id, subscription_id, cycle_number, cycle_status,
--     selection_window_start, selection_window_end, selection_window_status,
--     selected_toys, toys_count, plan_id, plan_name,
--     created_at, updated_at
-- ) SELECT ... FROM rental_orders ...

