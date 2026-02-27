-- =====================================================
-- MIGRATION SCRIPT: Existing Orders → rental_orders Table
-- =====================================================
-- 
-- This script migrates all existing orders from the fragmented approach
-- (orders + order_items + payment_orders) to the unified rental_orders table.
-- 
-- Run: psql $DATABASE_URL -f migrate-existing-orders.sql
-- =====================================================

-- Step 1: Create a temporary function to aggregate order items into JSONB
CREATE OR REPLACE FUNCTION aggregate_order_items(order_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    toys_data JSONB := '[]'::JSONB;
    item_record RECORD;
BEGIN
    FOR item_record IN 
        SELECT 
            oi.*,
            t.name as toy_name,
            t.description as toy_description,
            t.image_url as toy_image_url,
            t.category as toy_category,
            t.age_group as toy_age_group,
            t.rental_price as toy_rental_price
        FROM order_items oi
        LEFT JOIN toys t ON oi.toy_id = t.id
        WHERE oi.order_id = order_uuid
    LOOP
        toys_data := toys_data || jsonb_build_object(
            'toy_id', item_record.toy_id,
            'name', COALESCE(item_record.toy_name, 'Unknown Toy'),
            'description', COALESCE(item_record.toy_description, ''),
            'image_url', COALESCE(item_record.toy_image_url, ''),
            'category', COALESCE(item_record.toy_category, ''),
            'age_group', COALESCE(item_record.toy_age_group, item_record.age_group, ''),
            'quantity', COALESCE(item_record.quantity, 1),
            'unit_price', COALESCE(item_record.unit_price, item_record.toy_rental_price, 0),
            'total_price', COALESCE(item_record.total_price, item_record.unit_price * item_record.quantity, 0),
            'returned', false,
            'subscription_category', COALESCE(item_record.subscription_category, ''),
            'ride_on_toy_id', item_record.ride_on_toy_id
        );
    END LOOP;
    
    RETURN toys_data;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create a function to get the latest payment data for a user
CREATE OR REPLACE FUNCTION get_latest_payment_data(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    payment_data JSONB := '{}'::JSONB;
    payment_record RECORD;
BEGIN
    -- Try payment_orders first
    SELECT * INTO payment_record
    FROM payment_orders 
    WHERE user_id = user_uuid 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF FOUND THEN
        payment_data := jsonb_build_object(
            'razorpay_order_id', payment_record.razorpay_order_id,
            'razorpay_payment_id', payment_record.razorpay_payment_id,
            'payment_amount', payment_record.amount,
            'payment_currency', payment_record.currency,
            'payment_status', payment_record.status,
            'source', 'payment_orders'
        );
        RETURN payment_data;
    END IF;
    
    -- Fallback to payment_tracking
    SELECT * INTO payment_record
    FROM payment_tracking 
    WHERE user_id = user_uuid 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF FOUND THEN
        payment_data := jsonb_build_object(
            'razorpay_order_id', payment_record.razorpay_order_id,
            'razorpay_payment_id', payment_record.razorpay_payment_id,
            'payment_amount', payment_record.amount,
            'payment_currency', payment_record.currency,
            'payment_status', payment_record.status,
            'source', 'payment_tracking'
        );
        RETURN payment_data;
    END IF;
    
    -- Return empty if no payment data found
    RETURN payment_data;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create a function to get subscription data for a user
CREATE OR REPLACE FUNCTION get_subscription_data(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    subscription_data JSONB := '{}'::JSONB;
    sub_record RECORD;
BEGIN
    SELECT * INTO sub_record
    FROM subscription_tracking 
    WHERE user_id = user_uuid 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF FOUND THEN
        subscription_data := jsonb_build_object(
            'subscription_id', sub_record.id,
            'plan_id', sub_record.plan_id,
            'age_group', sub_record.age_group,
            'subscription_type', sub_record.subscription_type
        );
    END IF;
    
    RETURN subscription_data;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Show migration preview
DO $$
DECLARE
    order_count INTEGER;
    existing_rental_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO order_count FROM orders;
    SELECT COUNT(*) INTO existing_rental_count FROM rental_orders WHERE legacy_order_id IS NOT NULL;
    
    RAISE NOTICE '📊 MIGRATION PREVIEW:';
    RAISE NOTICE '====================';
    RAISE NOTICE '📦 Total orders to migrate: %', order_count;
    RAISE NOTICE '🔄 Already migrated orders: %', existing_rental_count;
    RAISE NOTICE '🆕 Orders to process: %', order_count - existing_rental_count;
    RAISE NOTICE '';
END $$;

-- Step 5: Perform the actual migration
INSERT INTO rental_orders (
    -- Legacy tracking
    legacy_order_id,
    legacy_created_at,
    migrated_at,
    
    -- Basic order info
    user_id,
    user_phone,
    status,
    order_type,
    
    -- Financial data
    total_amount,
    base_amount,
    gst_amount,
    discount_amount,
    coupon_code,
    
    -- Payment information
    payment_status,
    payment_method,
    razorpay_order_id,
    razorpay_payment_id,
    payment_amount,
    payment_currency,
    
    -- Subscription data
    subscription_plan,
    subscription_category,
    subscription_id,
    cycle_number,
    
    -- Rental dates
    rental_start_date,
    rental_end_date,
    
    -- Delivery tracking
    delivery_date,
    returned_date,
    return_status,
    
    -- JSONB data
    toys_data,
    toys_delivered_count,
    toys_returned_count,
    shipping_address,
    
    -- Age group
    age_group,
    
    -- Status timestamps
    confirmed_at,
    shipped_at,
    delivered_at,
    
    -- Metadata
    delivery_instructions,
    admin_notes,
    internal_status,
    
    -- Timestamps
    created_at,
    updated_at
)
SELECT 
    -- Legacy tracking
    o.id as legacy_order_id,
    o.created_at as legacy_created_at,
    NOW() as migrated_at,
    
    -- Basic order info
    o.user_id,
    cu.phone as user_phone,
    COALESCE(o.status, 'pending') as status,
    COALESCE(o.order_type, 'subscription') as order_type,
    
    -- Financial data
    COALESCE(o.total_amount, 0) as total_amount,
    COALESCE(o.base_amount, 0) as base_amount,
    COALESCE(o.gst_amount, 0) as gst_amount,
    COALESCE(o.discount_amount, 0) as discount_amount,
    o.coupon_code,
    
    -- Payment information
    COALESCE((payment_data->>'payment_status'), 'pending') as payment_status,
    'razorpay' as payment_method,
    (payment_data->>'razorpay_order_id') as razorpay_order_id,
    (payment_data->>'razorpay_payment_id') as razorpay_payment_id,
    COALESCE((payment_data->>'payment_amount')::NUMERIC, o.total_amount, 0) as payment_amount,
    COALESCE((payment_data->>'payment_currency'), 'INR') as payment_currency,
    
    -- Subscription data
    COALESCE((subscription_data->>'plan_id'), 'basic') as subscription_plan,
    COALESCE((subscription_data->>'plan_id'), 'basic') as subscription_category,
    (subscription_data->>'subscription_id')::UUID as subscription_id,
    1 as cycle_number,
    
    -- Rental dates
    COALESCE(o.rental_start_date::DATE, CURRENT_DATE) as rental_start_date,
    COALESCE(o.rental_end_date::DATE, CURRENT_DATE + INTERVAL '30 days') as rental_end_date,
    
    -- Delivery tracking
    o.delivered_at::DATE as delivery_date,
    o.returned_date::DATE as returned_date,
    CASE WHEN o.returned_date IS NOT NULL THEN 'returned' ELSE 'pending' END as return_status,
    
    -- JSONB data
    COALESCE(aggregate_order_items(o.id), '[]'::JSONB) as toys_data,
    COALESCE(jsonb_array_length(aggregate_order_items(o.id)), 0) as toys_delivered_count,
    CASE WHEN o.returned_date IS NOT NULL 
         THEN COALESCE(jsonb_array_length(aggregate_order_items(o.id)), 0)
         ELSE 0 
    END as toys_returned_count,
    COALESCE(o.shipping_address, '{}'::JSONB) as shipping_address,
    
    -- Age group (from subscription or first toy)
    COALESCE(
        (subscription_data->>'age_group'),
        '3-5'
    ) as age_group,
    
    -- Status timestamps
    COALESCE(o.confirmed_at, CASE WHEN payment_data->>'payment_status' = 'completed' THEN o.created_at END) as confirmed_at,
    COALESCE(o.shipped_at, o.confirmed_at) as shipped_at,
    COALESCE(o.delivered_at, o.shipped_at) as delivered_at,
    
    -- Metadata
    o.delivery_instructions,
    ('Migrated from legacy order ' || o.id::TEXT) as admin_notes,
    'migrated' as internal_status,
    
    -- Timestamps
    o.created_at,
    COALESCE(o.updated_at, NOW()) as updated_at

FROM orders o
LEFT JOIN custom_users cu ON o.user_id = cu.id
CROSS JOIN LATERAL get_latest_payment_data(o.user_id) AS payment_data
CROSS JOIN LATERAL get_subscription_data(o.user_id) AS subscription_data
WHERE o.id NOT IN (
    SELECT legacy_order_id 
    FROM rental_orders 
    WHERE legacy_order_id IS NOT NULL
)
ORDER BY o.created_at;

-- Step 6: Show migration results
DO $$
DECLARE
    total_orders INTEGER;
    migrated_orders INTEGER;
    new_rental_orders INTEGER;
    success_rate NUMERIC;
BEGIN
    SELECT COUNT(*) INTO total_orders FROM orders;
    SELECT COUNT(*) INTO migrated_orders FROM rental_orders WHERE legacy_order_id IS NOT NULL;
    SELECT COUNT(*) INTO new_rental_orders FROM rental_orders WHERE legacy_order_id IS NULL;
    
    IF total_orders > 0 THEN
        success_rate := (migrated_orders::NUMERIC / total_orders::NUMERIC) * 100;
    ELSE
        success_rate := 0;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 MIGRATION COMPLETED!';
    RAISE NOTICE '========================';
    RAISE NOTICE '📦 Total original orders: %', total_orders;
    RAISE NOTICE '✅ Successfully migrated: %', migrated_orders;
    RAISE NOTICE '🆕 New rental orders: %', new_rental_orders;
    RAISE NOTICE '📈 Success rate: %.1f%%', success_rate;
    RAISE NOTICE '';
    
    IF migrated_orders = total_orders THEN
        RAISE NOTICE '🎯 PERFECT MIGRATION! All orders successfully transferred.';
    ELSIF migrated_orders > 0 THEN
        RAISE NOTICE '⚠️ PARTIAL MIGRATION: % orders may need manual review.', total_orders - migrated_orders;
    ELSE
        RAISE NOTICE '❌ MIGRATION FAILED: No orders were migrated.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔧 NEXT STEPS:';
    RAISE NOTICE '==============';
    RAISE NOTICE '1. Test admin dashboard with migrated orders';
    RAISE NOTICE '2. Test user dashboard functionality';
    RAISE NOTICE '3. Create new test order to verify unified flow';
    RAISE NOTICE '4. Monitor rental_orders table for new orders';
    
    IF migrated_orders = total_orders THEN
        RAISE NOTICE '5. Consider archiving old orders/order_items tables';
    END IF;
END $$;

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rental_orders_legacy_order_id 
ON rental_orders(legacy_order_id) 
WHERE legacy_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rental_orders_user_created 
ON rental_orders(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rental_orders_status_created 
ON rental_orders(status, created_at DESC);

-- Step 8: Clean up temporary functions
DROP FUNCTION IF EXISTS aggregate_order_items(UUID);
DROP FUNCTION IF EXISTS get_latest_payment_data(UUID);
DROP FUNCTION IF EXISTS get_subscription_data(UUID);

-- Step 9: Final validation query
SELECT 
    'VALIDATION SUMMARY' as check_type,
    (SELECT COUNT(*) FROM orders) as original_orders,
    (SELECT COUNT(*) FROM rental_orders) as total_rental_orders,
    (SELECT COUNT(*) FROM rental_orders WHERE legacy_order_id IS NOT NULL) as migrated_orders,
    (SELECT COUNT(*) FROM rental_orders WHERE legacy_order_id IS NULL) as new_orders;

RAISE NOTICE '';
RAISE NOTICE '✅ Migration script completed successfully!';
RAISE NOTICE 'Check the validation summary above for final counts.'; 