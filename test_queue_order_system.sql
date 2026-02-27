-- ========================================
-- QUEUE ORDER SYSTEM TESTING AND MONITORING
-- Test and verify queue order functionality works properly
-- ========================================

-- Test 1: Test queue order creation for the specific user
SELECT test_queue_order_creation('12593968-a147-478e-acb5-5a229c70da2b'::UUID);

-- Test 2: Check current selection window status for user
SELECT 
  ro.order_number,
  ro.subscription_plan,
  ro.cycle_number,
  ro.selection_window_status,
  ro.manual_selection_control,
  ro.selection_window_opened_at,
  ro.selection_window_closed_at,
  ro.selection_window_notes,
  
  -- Current cycle day
  (CURRENT_DATE::date - ro.rental_start_date::date) + 1 as current_cycle_day,
  
  -- What status should be based on timing
  CASE 
    WHEN (CURRENT_DATE::date - ro.rental_start_date::date) + 1 BETWEEN 24 AND 34 
    THEN 'should_be_open'
    ELSE 'should_be_closed'
  END as timing_based_status,
  
  -- Recommendations
  CASE 
    WHEN ro.selection_window_status = 'auto' AND (CURRENT_DATE::date - ro.rental_start_date::date) + 1 BETWEEN 24 AND 34
    THEN 'SHOULD_UPDATE_TO_auto_open'
    WHEN ro.selection_window_status IN ('manual_open', 'auto_open') AND (CURRENT_DATE::date - ro.rental_start_date::date) + 1 NOT BETWEEN 24 AND 34
    THEN 'SHOULD_UPDATE_TO_auto_closed'
    ELSE 'STATUS_OK'
  END as recommendation

FROM rental_orders ro
WHERE ro.user_id = '12593968-a147-478e-acb5-5a229c70da2b'::UUID
AND ro.subscription_status = 'active'
ORDER BY ro.created_at DESC
LIMIT 1;

-- Test 3: Check recent queue orders for user
SELECT 
  qo.id,
  qo.order_number,
  qo.status,
  qo.created_at,
  qo.selected_toys,
  (CURRENT_DATE::date - qo.created_at::date) as days_ago,
  
  -- Should this affect selection window?
  CASE 
    WHEN qo.status IN ('processing', 'confirmed', 'preparing', 'shipped', 'delivered')
    AND qo.created_at > CURRENT_DATE - INTERVAL '7 days'
    THEN 'YES_SHOULD_CLOSE_WINDOW'
    ELSE 'NO_IMPACT'
  END as window_impact
  
FROM queue_orders qo
WHERE qo.user_id = '12593968-a147-478e-acb5-5a229c70da2b'::UUID
ORDER BY qo.created_at DESC
LIMIT 5;

-- Test 4: Check audit logs for this user
SELECT 
  action,
  resource_type,
  resource_id,
  action_details,
  metadata,
  created_at
FROM admin_audit_logs 
WHERE user_id = '12593968-a147-478e-acb5-5a229c70da2b'::UUID
ORDER BY created_at DESC
LIMIT 10;

-- Test 5: Monitor system health
SELECT 
  'queue_orders' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN created_at > CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as created_today,
  COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
  COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders
FROM queue_orders

UNION ALL

SELECT 
  'rental_orders' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN created_at > CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as created_today,
  COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_subscriptions,
  COUNT(CASE WHEN selection_window_status = 'manual_open' THEN 1 END) as manually_opened_windows
FROM rental_orders;

-- Test 6: Check RLS policies are working
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('admin_audit_logs', 'queue_orders', 'rental_orders')
ORDER BY tablename, policyname;


