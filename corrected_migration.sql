-- =====================================
-- CORRECTED MIGRATION SCRIPT (ONLY EXISTING COLUMNS)
-- =====================================

-- Based on the error, here's the corrected migration that only uses columns that exist

INSERT INTO subscription_management (
    user_id,
    order_id,
    subscription_id,
    cycle_number,
    cycle_status,
    cycle_start_date,
    cycle_end_date,
    
    -- ✅ Selection window fields (required)
    selection_window_start,
    selection_window_end,
    selection_window_status,
    
    -- ✅ Toy selection fields
    selected_toys,
    toys_selected_at,
    toys_count,
    
    -- ✅ Plan fields
    plan_id,
    plan_name,
    
    -- ✅ Timestamps
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
    
    -- ✅ Calculate selection window (Day 20-25 of 30-day cycle)
    (ro.rental_start_date::DATE + INTERVAL '19 days')::DATE,
    (ro.rental_start_date::DATE + INTERVAL '24 days')::DATE,
    
    -- ✅ Determine current selection status
    CASE 
        WHEN CURRENT_DATE BETWEEN (ro.rental_start_date::DATE + INTERVAL '19 days') 
                               AND (ro.rental_start_date::DATE + INTERVAL '24 days') 
        THEN 'open'
        WHEN CURRENT_DATE < (ro.rental_start_date::DATE + INTERVAL '19 days') 
        THEN 'upcoming'
        ELSE 'closed'
    END,
    
    -- ✅ Use existing toy data
    COALESCE(ro.toys_data, '[]'::jsonb),
    ro.created_at,
    COALESCE(ro.toys_delivered_count, 0),
    
    -- ✅ Plan mapping (use existing column names)
    COALESCE(ro.subscription_category, 'discovery-delight'),
    CASE 
        WHEN ro.subscription_category = 'silver-pack' THEN 'Silver Pack'
        WHEN ro.subscription_category = 'gold-pack' THEN 'Gold Pack PRO'
        ELSE 'Discovery Delight'
    END,
    
    -- ✅ Timestamps
    ro.created_at,
    CURRENT_TIMESTAMP
FROM rental_orders ro
WHERE ro.subscription_status = 'active'
AND NOT EXISTS (
    SELECT 1 FROM subscription_management sm 
    WHERE sm.order_id = ro.id
);

-- Verify the migration worked
SELECT 
    COUNT(*) as migrated_cycles,
    plan_name,
    cycle_status,
    selection_window_status
FROM subscription_management 
GROUP BY plan_name, cycle_status, selection_window_status
ORDER BY plan_name;

