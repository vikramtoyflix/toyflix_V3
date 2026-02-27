-- =====================================================
-- DEBUG MIGRATION FAILURES
-- =====================================================

-- Test 1: Check if we can select orders with user_id
DO $$
DECLARE
    orders_with_users INTEGER;
    sample_order RECORD;
BEGIN
    RAISE NOTICE '=== TEST 1: BASIC ORDER SELECTION ===';
    
    SELECT COUNT(*) INTO orders_with_users
    FROM orders o
    WHERE o.user_id IS NOT NULL;
    
    RAISE NOTICE 'Orders with user_id: %', orders_with_users;
    
    -- Get a sample order
    SELECT 
        o.id,
        o.user_id,
        o.status,
        o.rental_start_date,
        o.rental_end_date,
        o.created_at
    INTO sample_order
    FROM orders o
    WHERE o.user_id IS NOT NULL
    LIMIT 1;
    
    RAISE NOTICE 'Sample order ID: %', sample_order.id;
    RAISE NOTICE 'Sample user ID: %', sample_order.user_id;
    RAISE NOTICE 'Sample status: %', sample_order.status;
END $$;

-- Test 2: Check if user_id exists in custom_users
DO $$
DECLARE
    sample_user_id UUID;
    user_exists BOOLEAN;
    user_record RECORD;
BEGIN
    RAISE NOTICE '=== TEST 2: USER VALIDATION ===';
    
    -- Get a sample user_id from orders
    SELECT user_id INTO sample_user_id
    FROM orders
    WHERE user_id IS NOT NULL
    LIMIT 1;
    
    RAISE NOTICE 'Testing user_id: %', sample_user_id;
    
    -- Check if this user exists in custom_users
    SELECT EXISTS(
        SELECT 1 FROM custom_users WHERE id = sample_user_id
    ) INTO user_exists;
    
    RAISE NOTICE 'User exists in custom_users: %', user_exists;
    
    IF user_exists THEN
        SELECT first_name, last_name, phone INTO user_record
        FROM custom_users 
        WHERE id = sample_user_id;
        
        RAISE NOTICE 'User details: % % (%)', user_record.first_name, user_record.last_name, user_record.phone;
    END IF;
END $$;

-- Test 3: Try to insert a single order manually
DO $$
DECLARE
    test_order RECORD;
    test_toys JSONB;
    insert_success BOOLEAN := false;
BEGIN
    RAISE NOTICE '=== TEST 3: MANUAL INSERT TEST ===';
    
    -- Get a real order
    SELECT 
        o.id as order_id,
        o.user_id,
        o.status,
        o.total_amount,
        o.rental_start_date,
        o.rental_end_date,
        o.created_at,
        o.shipping_address
    INTO test_order
    FROM orders o
    WHERE o.user_id IS NOT NULL
    LIMIT 1;
    
    RAISE NOTICE 'Testing with order: %', test_order.order_id;
    
    -- Get toys for this order
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'toy_id', oi.toy_id,
                'name', COALESCE(t.name, 'Unknown Toy'),
                'quantity', oi.quantity,
                'returned', false
            )
        ),
        '[]'::jsonb
    ) INTO test_toys
    FROM order_items oi
    LEFT JOIN toys t ON t.id = oi.toy_id
    WHERE oi.order_id = test_order.order_id;
    
    RAISE NOTICE 'Toys JSON: %', test_toys;
    
    -- Try to insert
    BEGIN
        INSERT INTO rental_orders (
            legacy_order_id,
            user_id,
            order_number,
            status,
            total_amount,
            cycle_number,
            rental_start_date,
            rental_end_date,
            toys_data,
            toys_delivered_count,
            shipping_address,
            created_at
        ) VALUES (
            test_order.order_id,
            test_order.user_id,
            'TEST-' || LEFT(test_order.order_id::text, 8),
            test_order.status,
            COALESCE(test_order.total_amount, 0),
            1,
            COALESCE(test_order.rental_start_date::date, test_order.created_at::date),
            COALESCE(test_order.rental_end_date::date, (test_order.created_at::date + INTERVAL '30 days')::date),
            test_toys,
            jsonb_array_length(test_toys),
            COALESCE(test_order.shipping_address, '{}'::jsonb),
            test_order.created_at
        );
        
        insert_success := true;
        RAISE NOTICE 'Manual insert SUCCESS!';
        
        -- Clean up test data
        DELETE FROM rental_orders WHERE order_number LIKE 'TEST-%';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Manual insert FAILED: %', SQLERRM;
            insert_success := false;
    END;
END $$;

-- Test 4: Check order_items relationship
DO $$
DECLARE
    sample_order_id UUID;
    items_count INTEGER;
    items_with_toys INTEGER;
BEGIN
    RAISE NOTICE '=== TEST 4: ORDER ITEMS CHECK ===';
    
    SELECT id INTO sample_order_id
    FROM orders
    WHERE user_id IS NOT NULL
    LIMIT 1;
    
    SELECT COUNT(*) INTO items_count
    FROM order_items
    WHERE order_id = sample_order_id;
    
    SELECT COUNT(*) INTO items_with_toys
    FROM order_items oi
    JOIN toys t ON t.id = oi.toy_id
    WHERE oi.order_id = sample_order_id;
    
    RAISE NOTICE 'Order % has % items, % with valid toys', sample_order_id, items_count, items_with_toys;
END $$;

-- Test 5: Check data types
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('user_id', 'rental_start_date', 'rental_end_date')
ORDER BY column_name;

-- Test 6: Show some actual data
SELECT 
    'Sample Orders:' as info,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as with_user_id,
    COUNT(CASE WHEN rental_start_date IS NOT NULL THEN 1 END) as with_rental_dates
FROM orders;

-- Test 7: Check if rental_orders table structure is correct
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'rental_orders' 
AND column_name IN ('user_id', 'rental_start_date', 'rental_end_date')
ORDER BY column_name; 