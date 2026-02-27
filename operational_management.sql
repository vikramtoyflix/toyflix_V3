-- =====================================
-- OPERATIONAL MANAGEMENT QUERIES
-- =====================================

-- ADMIN DASHBOARD QUERIES
-- =======================

-- 1. Daily selection window openings (for monitoring)
SELECT 
    selection_window_start::DATE as opens_on,
    COUNT(*) as cycles_opening,
    STRING_AGG(DISTINCT plan_name, ', ') as plans
FROM subscription_management 
WHERE selection_window_status = 'upcoming'
AND selection_window_start BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
GROUP BY selection_window_start::DATE
ORDER BY opens_on;

-- 2. Users requiring admin intervention (closed but recent)
SELECT 
    cu.email,
    cu.first_name,
    sm.cycle_number,
    sm.plan_name,
    sm.selection_window_end,
    CURRENT_DATE - sm.selection_window_end::DATE as days_since_closed
FROM subscription_management sm
JOIN custom_users cu ON sm.user_id = cu.id
WHERE sm.selection_window_status = 'closed'
AND sm.cycle_status = 'active'
AND sm.toys_count = 0  -- No toys selected
AND sm.selection_window_end >= CURRENT_DATE - INTERVAL '7 days'  -- Recently closed
ORDER BY days_since_closed ASC
LIMIT 20;

-- 3. Subscription health by plan (for business metrics)
SELECT 
    plan_name,
    COUNT(DISTINCT user_id) as total_subscribers,
    COUNT(*) as total_cycles,
    SUM(CASE WHEN toys_count > 0 THEN 1 ELSE 0 END) as cycles_with_toys,
    ROUND(
        SUM(CASE WHEN toys_count > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 
        2
    ) as engagement_rate
FROM subscription_management 
GROUP BY plan_name
ORDER BY total_subscribers DESC;

-- CYCLE TRANSITION AUTOMATION
-- ===========================

-- 4. Cycles ready to transition from active to completed
SELECT 
    COUNT(*) as cycles_to_complete,
    plan_name
FROM subscription_management 
WHERE cycle_status = 'active'
AND cycle_end_date < CURRENT_DATE
GROUP BY plan_name;

-- 5. Cycles ready to transition from pending to active  
SELECT 
    COUNT(*) as cycles_to_activate,
    plan_name
FROM subscription_management 
WHERE cycle_status = 'pending'
AND cycle_start_date <= CURRENT_DATE
GROUP BY plan_name;

-- PERFORMANCE MONITORING
-- ======================

-- 6. Selection window performance (toy selection rates)
SELECT 
    CASE 
        WHEN toys_count = 0 THEN 'No Selection'
        WHEN toys_count BETWEEN 1 AND 3 THEN '1-3 Toys'
        WHEN toys_count BETWEEN 4 AND 5 THEN '4-5 Toys'
        ELSE '5+ Toys'
    END as selection_category,
    COUNT(*) as cycles,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM subscription_management), 2) as percentage
FROM subscription_management 
GROUP BY 
    CASE 
        WHEN toys_count = 0 THEN 'No Selection'
        WHEN toys_count BETWEEN 1 AND 3 THEN '1-3 Toys'
        WHEN toys_count BETWEEN 4 AND 5 THEN '4-5 Toys'
        ELSE '5+ Toys'
    END
ORDER BY cycles DESC;

