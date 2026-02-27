-- Test script to verify selection window timing override for +91 users
-- Run this in your local Supabase SQL editor

-- 1. Check your user data (replace with your phone number)
SELECT 
  id,
  phone,
  first_name,
  last_name
FROM custom_users 
WHERE phone LIKE '%your-phone-number%';

-- 2. Check latest rental order selection window status (replace user_id)
SELECT 
  id,
  user_id,
  order_number,
  selection_window_status,
  manual_selection_control,
  created_at,
  updated_at
FROM rental_orders 
WHERE user_id = 'your-user-id-here'
ORDER BY created_at DESC 
LIMIT 1;

-- 3. Manually test closing the selection window (replace user_id)
-- SELECT close_selection_window_for_user('your-user-id-here', 'queue_order', 'Manual test - timing override');

-- 4. Verify the status changed
-- SELECT 
--   selection_window_status,
--   selection_window_closed_at,
--   selection_window_notes
-- FROM rental_orders 
-- WHERE user_id = 'your-user-id-here'
-- ORDER BY created_at DESC 
-- LIMIT 1;

-- Expected behavior after fixes:
-- 1. For +91 users, timing logic (day 24-30) should be overridden by database status
-- 2. If selection_window_status = 'manual_closed', Select Toys button should be inactive
-- 3. If selection_window_status = 'manual_open' or 'auto', timing logic applies
-- 4. This ensures queue orders properly close the selection window

-- Instructions:
-- 1. Replace 'your-phone-number' and 'your-user-id-here' with actual values
-- 2. Run queries 1-2 to check current status
-- 3. Place a queue order and verify selection_window_status changes to 'manual_closed'
-- 4. Refresh dashboard and verify "Select Toys" button is inactive
