-- =====================================================
-- DIAGNOSE MIGRATION ISSUE
-- =====================================================

-- Check the actual data structure in orders table
DO $$
DECLARE
    total_orders INTEGER;
    orders_with_rental_dates INTEGER;
    orders_with_user_id INTEGER;
    sample_order RECORD;
BEGIN
    RAISE NOTICE '=== DIAGNOSING MIGRATION ISSUE ===';
    
    -- Count total orders
    SELECT COUNT(*) INTO total_orders FROM orders;
    RAISE NOTICE 'Total orders in database: %', total_orders;
    
    -- Count orders with rental_start_date
    SELECT COUNT(*) INTO orders_with_rental_dates 
    FROM orders 
    WHERE rental_start_date IS NOT NULL;
    RAISE NOTICE 'Orders with rental_start_date: %', orders_with_rental_dates;
    
    -- Count orders with user_id
    SELECT COUNT(*) INTO orders_with_user_id 
    FROM orders 
    WHERE user_id IS NOT NULL;
    RAISE NOTICE 'Orders with user_id: %', orders_with_user_id;
    
    -- Show sample order structure
    SELECT * INTO sample_order FROM orders LIMIT 1;
    
    RAISE NOTICE '=== SAMPLE ORDER STRUCTURE ===';
    RAISE NOTICE 'Order ID: %', sample_order.id;
    RAISE NOTICE 'User ID: %', sample_order.user_id;
    RAISE NOTICE 'Status: %', sample_order.status;
    RAISE NOTICE 'Rental Start Date: %', sample_order.rental_start_date;
    RAISE NOTICE 'Rental End Date: %', sample_order.rental_end_date;
    RAISE NOTICE 'Created At: %', sample_order.created_at;
    
    -- Check if there are orders with rental dates but no user_id
    SELECT COUNT(*) INTO orders_with_rental_dates
    FROM orders 
    WHERE rental_start_date IS NOT NULL AND user_id IS NULL;
    RAISE NOTICE 'Orders with rental dates but no user_id: %', orders_with_rental_dates;
    
    -- Check orders with both rental dates and user_id
    SELECT COUNT(*) INTO orders_with_rental_dates
    FROM orders 
    WHERE rental_start_date IS NOT NULL AND user_id IS NOT NULL;
    RAISE NOTICE 'Orders with both rental dates AND user_id: %', orders_with_rental_dates;
    
END $$;

-- Check if rental_start_date and rental_end_date columns exist and their data types
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('rental_start_date', 'rental_end_date', 'user_id')
ORDER BY column_name;

-- Show actual sample data from orders table
SELECT 
    id,
    user_id,
    status,
    rental_start_date,
    rental_end_date,
    created_at,
    total_amount
FROM orders 
LIMIT 5;

-- Check for any orders that might have different date formats
DO $$
DECLARE
    sample_dates RECORD;
BEGIN
    RAISE NOTICE '=== CHECKING DATE FORMATS ===';
    
    FOR sample_dates IN 
        SELECT 
            id,
            rental_start_date,
            rental_end_date,
            created_at
        FROM orders 
        WHERE rental_start_date IS NOT NULL
        LIMIT 3
    LOOP
        RAISE NOTICE 'Order %: Start=%, End=%, Created=%', 
            sample_dates.id, 
            sample_dates.rental_start_date, 
            sample_dates.rental_end_date,
            sample_dates.created_at;
    END LOOP;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'No orders found with rental_start_date!';
        
        -- Check if the column exists but is empty
        RAISE NOTICE 'Checking for any non-null rental dates...';
        
        FOR sample_dates IN 
            SELECT 
                id,
                rental_start_date,
                rental_end_date
            FROM orders 
            WHERE rental_start_date IS NOT NULL OR rental_end_date IS NOT NULL
            LIMIT 3
        LOOP
            RAISE NOTICE 'Order % has some date: Start=%, End=%', 
                sample_dates.id, 
                sample_dates.rental_start_date, 
                sample_dates.rental_end_date;
        END LOOP;
    END IF;
END $$;

-- Check if there are any custom_users that exist
DO $$
DECLARE
    users_count INTEGER;
    sample_user RECORD;
BEGIN
    RAISE NOTICE '=== CHECKING USERS TABLE ===';
    
    SELECT COUNT(*) INTO users_count FROM custom_users;
    RAISE NOTICE 'Total users in custom_users: %', users_count;
    
    IF users_count > 0 THEN
        SELECT * INTO sample_user FROM custom_users LIMIT 1;
        RAISE NOTICE 'Sample user ID: %', sample_user.id;
        RAISE NOTICE 'Sample user name: % %', sample_user.first_name, sample_user.last_name;
    END IF;
END $$;

-- Check order_items table
DO $$
DECLARE
    items_count INTEGER;
    items_with_orders INTEGER;
BEGIN
    RAISE NOTICE '=== CHECKING ORDER_ITEMS TABLE ===';
    
    SELECT COUNT(*) INTO items_count FROM order_items;
    RAISE NOTICE 'Total order items: %', items_count;
    
    SELECT COUNT(DISTINCT order_id) INTO items_with_orders FROM order_items;
    RAISE NOTICE 'Unique orders in order_items: %', items_with_orders;
END $$; 