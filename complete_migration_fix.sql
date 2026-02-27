-- =====================================
-- FIXED SUBSCRIPTION MIGRATION SCRIPT
-- =====================================

-- Step 1: Check current table structure first
\d subscription_management;

-- Step 2: Fixed migration with ALL required fields
INSERT INTO subscription_management (
    user_id,
    order_id,
    subscription_id,
    cycle_number,
    cycle_status,
    cycle_start_date,
    cycle_end_date,
    
    -- ✅ FIXED: Add selection window fields (required)
    selection_window_start,
    selection_window_end,
    selection_window_status,
    
    -- ✅ FIXED: Add toy selection fields
    selected_toys,
    toys_selected_at,
    toys_count,
    
    -- ✅ FIXED: Add plan fields
    plan_id,
    plan_name,
    
    -- ✅ FIXED: Add other required fields
    total_amount,
    payment_status,
    created_at,
    updated_at
)
SELECT 
    ro.user_id,
    ro.id,
    COALESCE(ro.subscription_id, gen_random_uuid()),
    1, -- All existing orders become cycle 1
    'active',
    ro.rental_start_date::DATE,
    ro.rental_end_date::DATE,
    
    -- ✅ Calculate selection window (Day 20-25 of cycle)
    (ro.rental_start_date::DATE + INTERVAL '19 days')::DATE as selection_window_start,
    (ro.rental_start_date::DATE + INTERVAL '24 days')::DATE as selection_window_end,
    CASE 
        WHEN CURRENT_DATE BETWEEN (ro.rental_start_date::DATE + INTERVAL '19 days') 
                               AND (ro.rental_start_date::DATE + INTERVAL '24 days') 
        THEN 'open'
        WHEN CURRENT_DATE < (ro.rental_start_date::DATE + INTERVAL '19 days') 
        THEN 'upcoming'
        ELSE 'closed'
    END as selection_window_status,
    
    -- ✅ Use existing toy data
    COALESCE(ro.toys_data, '[]'::jsonb),
    ro.created_at,
    COALESCE(ro.toys_delivered_count, 0),
    
    -- ✅ Plan information
    COALESCE(ro.subscription_category, 'discovery-delight'),
    CASE 
        WHEN ro.subscription_category = 'silver-pack' THEN 'Silver Pack'
        WHEN ro.subscription_category = 'gold-pack' THEN 'Gold Pack PRO'
        ELSE 'Discovery Delight'
    END,
    
    -- ✅ Financial information
    COALESCE(ro.total_amount, 0.00),
    COALESCE(ro.payment_status, 'completed'),
    
    -- ✅ Timestamps
    ro.created_at,
    CURRENT_TIMESTAMP
FROM rental_orders ro
WHERE ro.subscription_status = 'active'
AND NOT EXISTS (
    SELECT 1 FROM subscription_management sm 
    WHERE sm.order_id = ro.id
)
-- ✅ Add limit for testing
LIMIT 10;

-- Step 3: Verify the migration
SELECT 
    sm.cycle_number,
    sm.plan_name,
    sm.cycle_status,
    sm.selection_window_status,
    sm.toys_count,
    sm.selection_window_start,
    sm.selection_window_end
FROM subscription_management sm
ORDER BY sm.created_at DESC
LIMIT 5;

-- Step 4: Update rental_orders with subscription_id where missing (safely)
UPDATE rental_orders 
SET subscription_id = gen_random_uuid() 
WHERE subscription_id IS NULL
AND id IN (
    SELECT id FROM rental_orders 
    WHERE subscription_id IS NULL 
    LIMIT 10
);

