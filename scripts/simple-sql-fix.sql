-- Simple Dashboard Fix - Run this in Supabase SQL Editor

-- Step 1: Check current state
SELECT 'Current user with phone 9980111432:' as info;
SELECT id, first_name, last_name, phone, email FROM custom_users WHERE phone = '9980111432';

-- Step 2: Check if authenticated user exists
SELECT 'Authenticated user exists:' as info;
SELECT id, first_name, phone FROM custom_users WHERE id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47';

-- Step 3: Update existing user ID to match authentication
-- This changes the user ID from the migrated one to the authenticated one

UPDATE custom_users 
SET id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
WHERE phone = '9980111432' 
  AND id != '249ebd40-50a4-4a44-ac70-aa32ec57cc47';

-- Step 4: Update orders to use the authenticated user ID and fix status
UPDATE orders 
SET user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47',
    status = 'delivered',
    rental_start_date = COALESCE(rental_start_date, NOW()),
    rental_end_date = COALESCE(rental_end_date, NOW() + INTERVAL '30 days')
WHERE user_id IN (
  SELECT id FROM custom_users WHERE phone = '9980111432'
) AND user_id != '249ebd40-50a4-4a44-ac70-aa32ec57cc47';

-- Step 5: Update subscriptions
UPDATE subscriptions 
SET user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47',
    status = 'active'
WHERE user_id IN (
  SELECT id FROM custom_users WHERE phone = '9980111432'
) AND user_id != '249ebd40-50a4-4a44-ac70-aa32ec57cc47';

-- Step 6: Update entitlements
UPDATE user_entitlements 
SET user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
WHERE user_id IN (
  SELECT id FROM custom_users WHERE phone = '9980111432'
) AND user_id != '249ebd40-50a4-4a44-ac70-aa32ec57cc47';

-- Step 7: Verify the fix
SELECT 'Final verification:' as info;

SELECT 'User profile:' as check;
SELECT id, first_name, last_name, phone, email, subscription_active, subscription_plan
FROM custom_users 
WHERE id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47';

SELECT 'Orders:' as check;
SELECT id, status, total_amount, rental_start_date, created_at 
FROM orders 
WHERE user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
ORDER BY created_at DESC;

SELECT 'Current rentals (should show in dashboard):' as check;
SELECT o.id, o.status, t.name as toy_name
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN toys t ON t.id = oi.toy_id
WHERE o.user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
  AND o.status IN ('shipped', 'delivered')
  AND o.returned_date IS NULL;

SELECT 'Subscriptions:' as check;
SELECT id, plan_id, status, start_date 
FROM subscriptions 
WHERE user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47';

SELECT 'Dashboard fix completed!' as result; 