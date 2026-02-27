-- Test script to verify selection window auto-close functionality locally
-- Run this in your local Supabase SQL editor

-- 1. Check if the auto-close function exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'close_selection_window_for_user'
);

-- 2. Check if the triggers exist
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name IN (
  'trigger_auto_close_selection_window_queue_orders',
  'trigger_auto_close_selection_window_rental_orders'
);

-- 3. Test the function manually (replace with your actual user_id)
-- SELECT close_selection_window_for_user('your-user-id-here', 'queue_order', 'Manual test');

-- 4. Check current selection window status for a user (replace with actual user_id)
-- SELECT 
--   id,
--   user_id,
--   selection_window_status,
--   selection_window_opened_at,
--   selection_window_closed_at,
--   manual_selection_control
-- FROM rental_orders 
-- WHERE user_id = 'your-user-id-here' 
-- ORDER BY created_at DESC 
-- LIMIT 5;

-- 5. Check if bulk close functions exist
SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'get_manual_selection_windows_count'
);

SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'close_all_manual_selection_windows'
);

-- Instructions:
-- 1. Run queries 1-2 and 5 to verify functions and triggers exist
-- 2. If they don't exist, you need to run the migration files:
--    - supabase/migrations/20250123000000_auto_close_selection_window_after_order.sql
--    - supabase/migrations/20250123000001_bulk_close_selection_windows.sql
-- 3. Replace 'your-user-id-here' in queries 3-4 with your actual user ID to test
