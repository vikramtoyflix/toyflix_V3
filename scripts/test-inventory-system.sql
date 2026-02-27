-- Test Script for Inventory Management System
-- Run this in Supabase SQL Editor to verify the system is working

-- ========================================
-- STEP 1: VERIFY ORIGINAL_TOY_ID POPULATION
-- ========================================

-- Check if original_toy_id is populated in age-specific tables
SELECT 
    'toys_1_2_years' as table_name,
    COUNT(*) as total_toys,
    COUNT(original_toy_id) as linked_toys,
    COUNT(*) - COUNT(original_toy_id) as unlinked_toys
FROM toys_1_2_years

UNION ALL

SELECT 
    'toys_2_3_years',
    COUNT(*),
    COUNT(original_toy_id),
    COUNT(*) - COUNT(original_toy_id)
FROM toys_2_3_years

UNION ALL

SELECT 
    'toys_3_4_years',
    COUNT(*),
    COUNT(original_toy_id),
    COUNT(*) - COUNT(original_toy_id)
FROM toys_3_4_years

UNION ALL

SELECT 
    'toys_4_6_years',
    COUNT(*),
    COUNT(original_toy_id),
    COUNT(*) - COUNT(original_toy_id)
FROM toys_4_6_years

UNION ALL

SELECT 
    'toys_6_8_years',
    COUNT(*),
    COUNT(original_toy_id),
    COUNT(*) - COUNT(original_toy_id)
FROM toys_6_8_years;

-- ========================================
-- STEP 2: TEST INVENTORY TRACKING
-- ========================================

-- Get sample toy inventory status
SELECT 
    t.id,
    t.name,
    t.total_quantity,
    t.available_quantity,
    -- Calculate reserved quantity (pending orders)
    COALESCE((
        SELECT SUM(oi.quantity)
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE (oi.toy_id = t.id OR oi.ride_on_toy_id = t.id)
        AND o.status = 'pending'
    ), 0) as reserved_quantity,
    -- Calculate rented quantity (delivered orders)
    COALESCE((
        SELECT SUM(oi.quantity)
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE (oi.toy_id = t.id OR oi.ride_on_toy_id = t.id)
        AND o.status = 'delivered'
    ), 0) as rented_quantity
FROM toys t
WHERE t.available_quantity <= 5  -- Show toys with low stock
ORDER BY t.available_quantity ASC
LIMIT 10;

-- ========================================
-- STEP 3: VERIFY INVENTORY FUNCTIONS
-- ========================================

-- Test the inventory summary function (if available)
-- Note: This will work once the RPC functions are created
-- SELECT * FROM get_inventory_summary();

-- Manual inventory summary calculation
SELECT 
    COUNT(*) as total_toys,
    SUM(total_quantity) as total_inventory,
    SUM(available_quantity) as total_available,
    COUNT(*) FILTER (WHERE available_quantity <= 2) as low_stock_toys,
    -- Calculate total reserved
    COALESCE((
        SELECT SUM(oi.quantity)
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status = 'pending'
    ), 0) as total_reserved,
    -- Calculate total rented
    COALESCE((
        SELECT SUM(oi.quantity)
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status = 'delivered'
    ), 0) as total_rented
FROM toys;

-- ========================================
-- STEP 4: TEST AGE-SPECIFIC TABLE LINKING
-- ========================================

-- Verify that toys in age-specific tables can be linked to main table
SELECT 
    at.name as age_table_toy,
    at.original_toy_id,
    t.name as main_table_toy,
    t.available_quantity,
    t.total_quantity
FROM toys_1_2_years at
LEFT JOIN toys t ON at.original_toy_id = t.id
WHERE at.original_toy_id IS NOT NULL
LIMIT 5;

-- ========================================
-- STEP 5: IDENTIFY POTENTIAL ISSUES
-- ========================================

-- Find toys in age tables without original_toy_id
SELECT 
    'toys_1_2_years' as table_name,
    name,
    category,
    'Missing original_toy_id' as issue
FROM toys_1_2_years
WHERE original_toy_id IS NULL
LIMIT 5;

-- Find toys with zero or negative inventory
SELECT 
    id,
    name,
    available_quantity,
    total_quantity,
    CASE 
        WHEN available_quantity < 0 THEN 'Negative available quantity'
        WHEN available_quantity = 0 THEN 'Zero available quantity'
        WHEN total_quantity = 0 THEN 'Zero total quantity'
        ELSE 'Other issue'
    END as issue
FROM toys
WHERE available_quantity <= 0 OR total_quantity <= 0
ORDER BY available_quantity ASC
LIMIT 10;

-- ========================================
-- STEP 6: PERFORMANCE TEST
-- ========================================

-- Test query performance for age-specific table access
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
    at.name,
    t.available_quantity,
    t.total_quantity
FROM toys_1_2_years at
JOIN toys t ON at.original_toy_id = t.id
WHERE t.available_quantity > 0
LIMIT 20;

-- ========================================
-- SUMMARY REPORT
-- ========================================

-- Generate a comprehensive summary
WITH inventory_stats AS (
    SELECT 
        COUNT(*) as total_toys,
        SUM(total_quantity) as total_inventory,
        SUM(available_quantity) as total_available,
        AVG(available_quantity) as avg_available,
        COUNT(*) FILTER (WHERE available_quantity = 0) as out_of_stock,
        COUNT(*) FILTER (WHERE available_quantity <= 2) as low_stock
    FROM toys
),
order_stats AS (
    SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(*) FILTER (WHERE o.status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE o.status = 'delivered') as delivered_orders,
        COALESCE(SUM(oi.quantity) FILTER (WHERE o.status = 'pending'), 0) as reserved_quantity,
        COALESCE(SUM(oi.quantity) FILTER (WHERE o.status = 'delivered'), 0) as rented_quantity
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
),
age_table_stats AS (
    SELECT 
        (SELECT COUNT(*) FROM toys_1_2_years WHERE original_toy_id IS NOT NULL) as linked_1_2,
        (SELECT COUNT(*) FROM toys_2_3_years WHERE original_toy_id IS NOT NULL) as linked_2_3,
        (SELECT COUNT(*) FROM toys_3_4_years WHERE original_toy_id IS NOT NULL) as linked_3_4,
        (SELECT COUNT(*) FROM toys_4_6_years WHERE original_toy_id IS NOT NULL) as linked_4_6,
        (SELECT COUNT(*) FROM toys_6_8_years WHERE original_toy_id IS NOT NULL) as linked_6_8
)
SELECT 
    'INVENTORY MANAGEMENT SYSTEM STATUS' as report_section,
    json_build_object(
        'inventory_summary', json_build_object(
            'total_toys', i.total_toys,
            'total_inventory', i.total_inventory,
            'total_available', i.total_available,
            'avg_available', ROUND(i.avg_available, 2),
            'out_of_stock', i.out_of_stock,
            'low_stock', i.low_stock
        ),
        'order_summary', json_build_object(
            'total_orders', o.total_orders,
            'pending_orders', o.pending_orders,
            'delivered_orders', o.delivered_orders,
            'reserved_quantity', o.reserved_quantity,
            'rented_quantity', o.rented_quantity
        ),
        'age_table_linking', json_build_object(
            'toys_1_2_years_linked', a.linked_1_2,
            'toys_2_3_years_linked', a.linked_2_3,
            'toys_3_4_years_linked', a.linked_3_4,
            'toys_4_6_years_linked', a.linked_4_6,
            'toys_6_8_years_linked', a.linked_6_8
        )
    ) as system_status
FROM inventory_stats i, order_stats o, age_table_stats a;

-- Success message
SELECT 'Inventory Management System Test Complete!' as status,
       'Review the results above to verify system functionality' as next_steps; 