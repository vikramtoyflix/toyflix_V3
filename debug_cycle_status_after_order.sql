-- Debug script to check cycle status after placing a queue order
-- Run this in your local Supabase SQL editor after placing a queue order

-- 1. Check your user ID (replace with your actual phone number)
SELECT id, phone, first_name, last_name 
FROM custom_users 
WHERE phone LIKE '%your-phone-number%';

-- 2. Check recent queue orders for your user (replace user_id)
SELECT 
  id,
  user_id,
  status,
  payment_status,
  created_at,
  updated_at
FROM queue_orders 
WHERE user_id = 'your-user-id-here'
ORDER BY created_at DESC 
LIMIT 3;

-- 3. Check rental orders selection window status (replace user_id)
SELECT 
  id,
  user_id,
  selection_window_status,
  selection_window_opened_at,
  selection_window_closed_at,
  manual_selection_control,
  created_at,
  updated_at
FROM rental_orders 
WHERE user_id = 'your-user-id-here' 
ORDER BY created_at DESC 
LIMIT 3;

-- 4. Test the get_user_cycle_status function (replace user_id)
-- SELECT * FROM get_user_cycle_status('your-user-id-here');

-- 5. Check if the auto-close function was called (check audit logs if they exist)
SELECT 
  table_name,
  action,
  new_values,
  changed_at
FROM audit_log 
WHERE table_name = 'rental_orders' 
AND record_id IN (
  SELECT id FROM rental_orders WHERE user_id = 'your-user-id-here'
)
ORDER BY changed_at DESC 
LIMIT 5;

-- Instructions:
-- 1. Replace 'your-phone-number' and 'your-user-id-here' with your actual values
-- 2. Run query 1 to get your user ID
-- 3. Use that user ID in queries 2-5 to debug the selection window status
-- 4. Check if selection_window_status is 'manual_closed' after placing order
-- 5. If it's still 'auto' or 'manual_open', the auto-close function didn't work
