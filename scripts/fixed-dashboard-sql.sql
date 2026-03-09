-- Fixed Dashboard SQL - Handle Existing Phone Number
-- This script fixes the user ID mismatch without creating duplicates

BEGIN;

-- Step 1: Identify the current state
SELECT 'DIAGNOSIS: Current state...' as step;

-- Check users with phone 9980111432
SELECT 'Users with phone 9980111432:' as info;
SELECT id, first_name, last_name, phone, email, subscription_active, subscription_plan, created_at
FROM custom_users 
WHERE phone = '9980111432';

-- Check if authenticated user ID exists
SELECT 'Authenticated user exists:' as info;
SELECT CASE 
  WHEN EXISTS(SELECT 1 FROM custom_users WHERE id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47') 
  THEN 'YES - User exists with this ID'
  ELSE 'NO - User does not exist with this ID'
END as result;

-- Find which user has the data (orders/subscriptions)
SELECT 'Users with actual data:' as info;
SELECT DISTINCT cu.id, cu.first_name, cu.phone, 
       COUNT(DISTINCT o.id) as order_count,
       COUNT(DISTINCT s.id) as subscription_count
FROM custom_users cu
LEFT JOIN orders o ON o.user_id = cu.id
LEFT JOIN subscriptions s ON s.user_id = cu.id
WHERE cu.phone = '9980111432'
GROUP BY cu.id, cu.first_name, cu.phone;

-- Step 2: Fix approach - Update existing user's ID to match authentication
SELECT 'FIX: Updating existing user ID to match authentication...' as step;

-- First, temporarily store the current user data
CREATE TEMP TABLE temp_user_data AS
SELECT * FROM custom_users WHERE phone = '9980111432' LIMIT 1;

-- Get the current user ID that has the data
DO $$
DECLARE
    current_user_id UUID;
    auth_user_id UUID := '249ebd40-50a4-4a44-ac70-aa32ec57cc47';
BEGIN
    -- Get the existing user ID
    SELECT id INTO current_user_id 
    FROM custom_users 
    WHERE phone = '9980111432' 
    LIMIT 1;
    
    RAISE NOTICE 'Current user ID: %', current_user_id;
    RAISE NOTICE 'Target auth ID: %', auth_user_id;
    
    -- Only proceed if IDs are different
    IF current_user_id != auth_user_id THEN
        -- Update all related records to use the authenticated user ID
        
        -- Update orders
        UPDATE orders 
        SET user_id = auth_user_id,
            status = CASE 
              WHEN status = 'pending' THEN 'delivered'
              ELSE status 
            END,
            rental_start_date = CASE 
              WHEN rental_start_date IS NULL THEN NOW()
              ELSE rental_start_date 
            END,
            rental_end_date = CASE 
              WHEN rental_end_date IS NULL THEN (NOW() + INTERVAL '30 days')
              ELSE rental_end_date 
            END
        WHERE user_id = current_user_id;
        
        -- Update subscriptions
        UPDATE subscriptions 
        SET user_id = auth_user_id,
            status = CASE 
              WHEN status = 'pending' THEN 'active'
              ELSE status 
            END
        WHERE user_id = current_user_id;
        
        -- Update user entitlements
        UPDATE user_entitlements 
        SET user_id = auth_user_id
        WHERE user_id = current_user_id;
        
        -- Delete the old user record
        DELETE FROM custom_users WHERE id = current_user_id;
        
        -- Create new user record with authenticated ID
        INSERT INTO custom_users (
          id, phone, first_name, last_name, email, 
          phone_verified, created_at, updated_at, is_active, role,
          address_line1, address_line2, city, state, zip_code,
          subscription_active, subscription_plan, subscription_end_date
        )
        SELECT 
          auth_user_id,
          phone, first_name, last_name, email,
          phone_verified, created_at, NOW() as updated_at, 
          COALESCE(is_active, true) as is_active, 
          COALESCE(role, 'user') as role,
          address_line1, address_line2, city, state, zip_code,
          subscription_active, subscription_plan, subscription_end_date
        FROM temp_user_data;
        
        RAISE NOTICE 'Successfully transferred data from % to %', current_user_id, auth_user_id;
    ELSE
        RAISE NOTICE 'User IDs already match, no transfer needed';
    END IF;
END $$;

-- Step 3: Verify the fix
SELECT 'VERIFICATION: Results after fix...' as step;

-- Check the authenticated user now exists and has data
SELECT 'Authenticated user profile:' as info;
SELECT id, first_name, last_name, phone, email, subscription_active, subscription_plan
FROM custom_users 
WHERE id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47';

-- Check orders
SELECT 'Orders for authenticated user:' as info;
SELECT o.id, o.status, o.total_amount, o.rental_start_date, o.rental_end_date, o.created_at,
       COUNT(oi.id) as item_count
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
GROUP BY o.id, o.status, o.total_amount, o.rental_start_date, o.rental_end_date, o.created_at
ORDER BY o.created_at DESC;

-- Check order items with toy names
SELECT 'Order items with toys:' as info;
SELECT oi.id, oi.quantity, oi.rental_price, t.name as toy_name, o.status as order_status
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN toys t ON t.id = oi.toy_id
WHERE o.user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
ORDER BY o.created_at DESC;

-- Check current rentals (what should show in "Toys at Home")
SELECT 'Current rentals (Toys at Home):' as info;
SELECT o.id as order_id, o.status, o.rental_start_date, t.name as toy_name
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN toys t ON t.id = oi.toy_id
WHERE o.user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
  AND o.status IN ('shipped', 'delivered')
  AND o.returned_date IS NULL;

-- Check subscriptions
SELECT 'Subscriptions:' as info;
SELECT id, plan_id, status, start_date, end_date, current_period_end
FROM subscriptions 
WHERE user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47';

-- Check entitlements
SELECT 'Entitlements:' as info;
SELECT subscription_id, standard_toys_remaining, big_toys_remaining, books_remaining, value_cap_remaining
FROM user_entitlements 
WHERE user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47';

-- Final summary
SELECT 'SUMMARY:' as info;
SELECT 
  'User ID: ' || id as detail
FROM custom_users 
WHERE id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
UNION ALL
SELECT 
  'Orders: ' || COUNT(*)::text as detail
FROM orders 
WHERE user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
UNION ALL
SELECT 
  'Current Rentals: ' || COUNT(*)::text as detail
FROM orders o
WHERE o.user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
  AND o.status IN ('shipped', 'delivered')
  AND o.returned_date IS NULL
UNION ALL
SELECT 
  'Subscriptions: ' || COUNT(*)::text as detail
FROM subscriptions 
WHERE user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47';

SELECT '🎉 Dashboard fix completed!' as result;
SELECT 'Refresh the dashboard to see the data.' as result;

-- Clean up
DROP TABLE IF EXISTS temp_user_data;

COMMIT;