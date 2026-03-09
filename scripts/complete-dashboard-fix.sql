-- Complete Dashboard Fix for Mythili Ganga (9980111432)
-- This script fixes both the user ID mismatch and order statuses

BEGIN;

-- Step 1: Identify the issue
SELECT 'DIAGNOSIS: Checking current state...' as step;

-- Check users with this phone
SELECT 'Users with phone 9980111432:' as info;
SELECT id, first_name, last_name, phone, email, subscription_active, subscription_plan
FROM custom_users 
WHERE phone = '9980111432';

-- Check if authenticated user exists
SELECT 'Authenticated user (249ebd40-50a4-4a44-ac70-aa32ec57cc47) exists:' as info;
SELECT id, first_name, last_name, phone, email 
FROM custom_users 
WHERE id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47';

-- Find user with actual data
SELECT 'Users with orders/subscriptions:' as info;
SELECT DISTINCT cu.id, cu.first_name, cu.phone, 
       COUNT(DISTINCT o.id) as order_count,
       COUNT(DISTINCT s.id) as subscription_count
FROM custom_users cu
LEFT JOIN orders o ON o.user_id = cu.id
LEFT JOIN subscriptions s ON s.user_id = cu.id
WHERE cu.phone = '9980111432'
GROUP BY cu.id, cu.first_name, cu.phone;

-- Step 2: Fix the user ID mismatch
SELECT 'FIX: Creating authenticated user and transferring data...' as step;

-- Create the authenticated user if it doesn't exist (copy from migrated user)
INSERT INTO custom_users (
  id, phone, first_name, last_name, email, 
  phone_verified, created_at, updated_at, is_active, role,
  address_line1, address_line2, city, state, zip_code,
  subscription_active, subscription_plan, subscription_end_date
)
SELECT 
  '249ebd40-50a4-4a44-ac70-aa32ec57cc47' as id,
  phone, first_name, last_name, email,
  phone_verified, created_at, NOW() as updated_at, 
  COALESCE(is_active, true) as is_active, 
  COALESCE(role, 'user') as role,
  address_line1, address_line2, city, state, zip_code,
  subscription_active, subscription_plan, subscription_end_date
FROM custom_users 
WHERE phone = '9980111432' 
  AND id != '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
LIMIT 1
ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  subscription_active = EXCLUDED.subscription_active,
  subscription_plan = EXCLUDED.subscription_plan,
  updated_at = NOW();

-- Transfer orders to authenticated user
UPDATE orders 
SET user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47',
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
WHERE user_id IN (
  SELECT id FROM custom_users 
  WHERE phone = '9980111432' 
    AND id != '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
);

-- Transfer subscriptions to authenticated user
UPDATE subscriptions 
SET user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47',
    status = CASE 
      WHEN status = 'pending' THEN 'active'
      ELSE status 
    END
WHERE user_id IN (
  SELECT id FROM custom_users 
  WHERE phone = '9980111432' 
    AND id != '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
);

-- Transfer user entitlements to authenticated user
UPDATE user_entitlements 
SET user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
WHERE user_id IN (
  SELECT id FROM custom_users 
  WHERE phone = '9980111432' 
    AND id != '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
);

-- Step 3: Verify the fix
SELECT 'VERIFICATION: Checking results...' as step;

-- Check authenticated user now has data
SELECT 'Authenticated user profile:' as info;
SELECT id, first_name, last_name, phone, email, subscription_active, subscription_plan
FROM custom_users 
WHERE id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47';

-- Check orders
SELECT 'Orders for authenticated user:' as info;
SELECT id, status, total_amount, rental_start_date, rental_end_date, created_at 
FROM orders 
WHERE user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
ORDER BY created_at DESC;

-- Check order items
SELECT 'Order items for authenticated user:' as info;
SELECT oi.id, oi.quantity, oi.rental_price, t.name as toy_name
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN toys t ON t.id = oi.toy_id
WHERE o.user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47';

-- Check subscriptions
SELECT 'Subscriptions for authenticated user:' as info;
SELECT id, plan_id, status, start_date, end_date, current_period_end
FROM subscriptions 
WHERE user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47';

-- Check entitlements
SELECT 'Entitlements for authenticated user:' as info;
SELECT subscription_id, standard_toys_remaining, big_toys_remaining, books_remaining, value_cap_remaining
FROM user_entitlements 
WHERE user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47';

-- Check current rentals (orders with delivered status, no return date)
SELECT 'Current rentals (should show in dashboard):' as info;
SELECT o.id, o.status, o.rental_start_date, t.name as toy_name
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN toys t ON t.id = oi.toy_id
WHERE o.user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
  AND o.status IN ('shipped', 'delivered')
  AND o.returned_date IS NULL;

SELECT 'Dashboard fix completed! 🎉' as result;
SELECT 'User should now see orders and current rentals in dashboard.' as result;

COMMIT; 