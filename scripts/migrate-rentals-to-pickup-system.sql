-- =========================================================
-- MIGRATE EXISTING RENTAL ORDERS TO PICKUP SYSTEM
-- =========================================================
-- This script migrates existing rental orders that need pickup
-- to the specialized pickup system tables for the dashboard

-- Step 1: Check current data status
DO $$
BEGIN
    RAISE NOTICE '=== PICKUP SYSTEM MIGRATION ANALYSIS ===';
    RAISE NOTICE 'Current rental_orders count: %', (SELECT COUNT(*) FROM rental_orders);
    RAISE NOTICE 'Orders needing pickup (delivered/active, not returned): %', 
        (SELECT COUNT(*) FROM rental_orders 
         WHERE status IN ('delivered', 'active') 
         AND return_status IN ('not_returned', 'partial'));
    RAISE NOTICE 'Current scheduled_pickups count: %', (SELECT COUNT(*) FROM scheduled_pickups);
    RAISE NOTICE 'Current pickup_routes count: %', (SELECT COUNT(*) FROM pickup_routes);
END $$;

-- Step 2: Create pincode pickup schedule entries for common pincodes
INSERT INTO pincode_pickup_schedule (pincode, pickup_day, area_name, zone, is_active)
SELECT DISTINCT 
    COALESCE(shipping_address->>'pincode', '560001') as pincode,
    CASE 
        WHEN COALESCE(shipping_address->>'pincode', '560001') LIKE '5600%' THEN 'monday'
        WHEN COALESCE(shipping_address->>'pincode', '560001') LIKE '5601%' THEN 'tuesday'
        WHEN COALESCE(shipping_address->>'pincode', '560001') LIKE '5602%' THEN 'wednesday'
        WHEN COALESCE(shipping_address->>'pincode', '560001') LIKE '5603%' THEN 'thursday'
        WHEN COALESCE(shipping_address->>'pincode', '560001') LIKE '5604%' THEN 'friday'
        WHEN COALESCE(shipping_address->>'pincode', '560001') LIKE '5605%' THEN 'saturday'
        ELSE 'monday'
    END as pickup_day,
    'Bangalore' as area_name,
    'Central' as zone,
    true as is_active
FROM rental_orders 
WHERE shipping_address IS NOT NULL 
AND status IN ('delivered', 'active')
AND return_status IN ('not_returned', 'partial')
ON CONFLICT (pincode) DO UPDATE SET
    updated_at = now();

-- Step 3: Migrate rental orders to scheduled pickups
INSERT INTO scheduled_pickups (
    rental_order_id,
    user_id,
    scheduled_pickup_date,
    pickup_day,
    customer_name,
    customer_phone,
    customer_address,
    pincode,
    subscription_id,
    cycle_number,
    cycle_end_date,
    days_into_cycle,
    toys_to_pickup,
    toys_count,
    pickup_status,
    notification_sent_date,
    created_at,
    updated_at
)
SELECT 
    ro.id as rental_order_id,
    ro.user_id,
    -- Schedule pickup 2-3 days before rental end date
    GREATEST(
        ro.rental_end_date - INTERVAL '3 days',
        CURRENT_DATE + INTERVAL '1 day'
    ) as scheduled_pickup_date,
    COALESCE(
        pps.pickup_day,
        CASE 
            WHEN COALESCE(ro.shipping_address->>'pincode', '560001') LIKE '5600%' THEN 'monday'
            WHEN COALESCE(ro.shipping_address->>'pincode', '560001') LIKE '5601%' THEN 'tuesday'
            WHEN COALESCE(ro.shipping_address->>'pincode', '560001') LIKE '5602%' THEN 'wednesday'
            WHEN COALESCE(ro.shipping_address->>'pincode', '560001') LIKE '5603%' THEN 'thursday'
            WHEN COALESCE(ro.shipping_address->>'pincode', '560001') LIKE '5604%' THEN 'friday'
            WHEN COALESCE(ro.shipping_address->>'pincode', '560001') LIKE '5605%' THEN 'saturday'
            ELSE 'monday'
        END
    ) as pickup_day,
    COALESCE(
        cu.full_name,
        cu.first_name || ' ' || COALESCE(cu.last_name, ''),
        ro.shipping_address->>'name',
        'Customer'
    ) as customer_name,
    COALESCE(
        cu.phone,
        ro.user_phone,
        ro.shipping_address->>'phone',
        ''
    ) as customer_phone,
    ro.shipping_address as customer_address,
    COALESCE(ro.shipping_address->>'pincode', '560001') as pincode,
    ro.subscription_id,
    ro.cycle_number,
    ro.rental_end_date as cycle_end_date,
    GREATEST(
        DATE_PART('day', CURRENT_DATE - ro.rental_start_date)::INTEGER,
        1
    ) as days_into_cycle,
    ro.toys_data as toys_to_pickup,
    COALESCE(
        jsonb_array_length(ro.toys_data),
        ro.toys_delivered_count,
        0
    ) as toys_count,
    CASE 
        WHEN ro.return_status = 'complete' THEN 'completed'
        WHEN ro.returned_date IS NOT NULL THEN 'completed'
        WHEN ro.rental_end_date < CURRENT_DATE THEN 'scheduled'
        ELSE 'scheduled'
    END as pickup_status,
    CURRENT_DATE - INTERVAL '2 days' as notification_sent_date,
    ro.created_at,
    ro.updated_at
FROM rental_orders ro
LEFT JOIN custom_users cu ON cu.id = ro.user_id
LEFT JOIN pincode_pickup_schedule pps ON pps.pincode = COALESCE(ro.shipping_address->>'pincode', '560001')
WHERE ro.status IN ('delivered', 'active', 'returned')
AND ro.rental_start_date IS NOT NULL
AND ro.rental_end_date IS NOT NULL
-- Only migrate orders that don't already have scheduled pickups
AND NOT EXISTS (
    SELECT 1 FROM scheduled_pickups sp 
    WHERE sp.rental_order_id = ro.id
)
ORDER BY ro.created_at;

-- Step 4: Create pickup routes for each day
INSERT INTO pickup_routes (
    route_name,
    pickup_date,
    pickup_day,
    assigned_driver_name,
    assigned_driver_phone,
    total_planned_pickups,
    total_completed_pickups,
    route_status,
    covered_pincodes,
    estimated_duration_minutes,
    created_at,
    updated_at
)
SELECT DISTINCT
    pickup_day || ' Route - ' || scheduled_pickup_date::text as route_name,
    scheduled_pickup_date as pickup_date,
    pickup_day,
    'TBD' as assigned_driver_name,
    '' as assigned_driver_phone,
    COUNT(*) as total_planned_pickups,
    COUNT(CASE WHEN pickup_status = 'completed' THEN 1 END) as total_completed_pickups,
    CASE 
        WHEN scheduled_pickup_date < CURRENT_DATE THEN 'completed'
        WHEN scheduled_pickup_date = CURRENT_DATE THEN 'in_progress'
        ELSE 'planned'
    END as route_status,
    array_agg(DISTINCT pincode) as covered_pincodes,
    GREATEST(COUNT(*) * 20, 120) as estimated_duration_minutes, -- 20 min per pickup, minimum 2 hours
    MIN(created_at) as created_at,
    MAX(updated_at) as updated_at
FROM scheduled_pickups
WHERE scheduled_pickup_date IS NOT NULL
AND pickup_day IS NOT NULL
-- Only create routes that don't already exist
AND NOT EXISTS (
    SELECT 1 FROM pickup_routes pr 
    WHERE pr.pickup_date = scheduled_pickups.scheduled_pickup_date
    AND pr.pickup_day = scheduled_pickups.pickup_day
)
GROUP BY pickup_day, scheduled_pickup_date
ORDER BY scheduled_pickup_date;

-- Step 5: Link scheduled pickups to their routes
UPDATE scheduled_pickups 
SET pickup_route_id = pr.id
FROM pickup_routes pr
WHERE scheduled_pickups.pickup_route_id IS NULL
AND scheduled_pickups.scheduled_pickup_date = pr.pickup_date
AND scheduled_pickups.pickup_day = pr.pickup_day;

-- Step 6: Insert basic system configuration
INSERT INTO pickup_system_config (config_key, config_value, config_type, description, is_active)
VALUES 
    ('advance_notice_days', '5', 'integer', 'Days in advance to notify customers about pickup', true),
    ('max_daily_capacity', '25', 'integer', 'Maximum pickups per day per area', true),
    ('pickup_cycle_days', '30', 'integer', 'Standard rental cycle length in days', true),
    ('auto_schedule_enabled', 'true', 'boolean', 'Automatically schedule pickups for delivered orders', true),
    ('min_pickups_per_day', '5', 'integer', 'Minimum pickups per day to create a route', true),
    ('max_pickups_per_day', '25', 'integer', 'Maximum pickups per day per route', true)
ON CONFLICT (config_key) DO UPDATE SET
    updated_at = now();

-- Step 7: Update rental_orders with pickup status
UPDATE rental_orders 
SET pickup_status = sp.pickup_status,
    scheduled_pickup_id = sp.id,
    customer_pickup_day = sp.pickup_day,
    pickup_scheduled_date = sp.scheduled_pickup_date,
    pickup_notification_sent = true,
    pickup_notification_date = sp.notification_sent_date::date
FROM scheduled_pickups sp
WHERE rental_orders.id = sp.rental_order_id
AND rental_orders.pickup_status IS NULL;

-- Step 8: Final verification and statistics
DO $$
DECLARE
    pickup_count INTEGER;
    route_count INTEGER;
    config_count INTEGER;
    pincode_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pickup_count FROM scheduled_pickups;
    SELECT COUNT(*) INTO route_count FROM pickup_routes;
    SELECT COUNT(*) INTO config_count FROM pickup_system_config WHERE is_active = true;
    SELECT COUNT(*) INTO pincode_count FROM pincode_pickup_schedule WHERE is_active = true;
    
    RAISE NOTICE '=== MIGRATION COMPLETED ===';
    RAISE NOTICE 'Scheduled pickups created: %', pickup_count;
    RAISE NOTICE 'Pickup routes created: %', route_count;
    RAISE NOTICE 'System config entries: %', config_count;
    RAISE NOTICE 'Pincode schedules: %', pincode_count;
    RAISE NOTICE '=== PICKUP DASHBOARD READY ===';
END $$; 