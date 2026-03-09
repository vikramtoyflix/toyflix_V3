-- Fix User ID Mismatch for Dashboard
-- This script updates the database records to match the authenticated user ID

-- Step 1: Check current state
SELECT 'Current users with phone 9980111432:' as info;
SELECT id, first_name, last_name, phone, email, created_at 
FROM custom_users 
WHERE phone = '9980111432';

-- Step 2: Check the authenticated user ID exists
SELECT 'Checking if authenticated user ID exists:' as info;
SELECT id, first_name, last_name, phone, email 
FROM custom_users 
WHERE id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47';

-- Step 3: Find the user with data (orders/subscriptions)
SELECT 'Users with orders:' as info;
SELECT DISTINCT cu.id, cu.first_name, cu.phone, COUNT(o.id) as order_count
FROM custom_users cu
LEFT JOIN orders o ON o.user_id = cu.id
WHERE cu.phone = '9980111432'
GROUP BY cu.id, cu.first_name, cu.phone;

-- Step 4: Fix the mismatch
-- Option A: Update the migrated user to use the authenticated user ID
-- (Only run this if the authenticated user ID doesn't exist)

-- First, create the authenticated user if it doesn't exist
INSERT INTO custom_users (
  id, phone, first_name, last_name, email, 
  phone_verified, created_at, updated_at, 
  subscription_active, subscription_plan
)
SELECT 
  '249ebd40-50a4-4a44-ac70-aa32ec57cc47',
  phone, first_name, last_name, email,
  phone_verified, created_at, updated_at,
  subscription_active, subscription_plan
FROM custom_users 
WHERE phone = '9980111432' 
  AND id != '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Update orders to use the authenticated user ID
UPDATE orders 
SET user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
WHERE user_id IN (
  SELECT id FROM custom_users WHERE phone = '9980111432' AND id != '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
);

-- Update subscriptions to use the authenticated user ID
UPDATE subscriptions 
SET user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
WHERE user_id IN (
  SELECT id FROM custom_users WHERE phone = '9980111432' AND id != '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
);

-- Update user_entitlements to use the authenticated user ID
UPDATE user_entitlements 
SET user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
WHERE user_id IN (
  SELECT id FROM custom_users WHERE phone = '9980111432' AND id != '249ebd40-50a4-4a44-ac70-aa32ec57cc47'
);

-- Step 5: Verify the fix
SELECT 'After fix - Orders for authenticated user:' as info;
SELECT id, status, total_amount, created_at 
FROM orders 
WHERE user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47';

SELECT 'After fix - Subscriptions for authenticated user:' as info;
SELECT id, plan_id, status, start_date 
FROM subscriptions 
WHERE user_id = '249ebd40-50a4-4a44-ac70-aa32ec57cc47';

SELECT 'Fix completed!' as info; 