-- Fix Missing Addresses in Queue Orders
-- This will populate missing addresses from user profiles

-- STEP 1: First, let's see what we're working with
SELECT 
  COUNT(*) as total_queue_orders,
  COUNT(CASE WHEN delivery_address = '{}' OR delivery_address IS NULL THEN 1 END) as missing_addresses,
  COUNT(CASE WHEN delivery_address != '{}' AND delivery_address IS NOT NULL THEN 1 END) as has_addresses
FROM queue_orders;

-- STEP 2: Show fixable orders (those with profile addresses)
SELECT 
  qo.order_number,
  qo.user_id,
  p.first_name || ' ' || p.last_name as customer_name,
  p.address_line1,
  p.city,
  p.state
FROM queue_orders qo
JOIN profiles p ON qo.user_id = p.id
WHERE (qo.delivery_address = '{}' OR qo.delivery_address IS NULL)
  AND p.address_line1 IS NOT NULL
ORDER BY qo.created_at DESC;

-- STEP 3: Update queue orders with missing addresses
-- ⚠️ BACKUP YOUR DATA FIRST!
-- ⚠️ Test on a few records before running on all

UPDATE queue_orders 
SET delivery_address = jsonb_build_object(
  'first_name', p.first_name,
  'last_name', p.last_name,
  'phone', COALESCE(p.phone, ''),
  'email', COALESCE(p.email, ''),
  'address_line1', p.address_line1,
  'address_line2', COALESCE(p.address_line2, ''),
  'city', p.city,
  'state', p.state,
  'postcode', COALESCE(p.zip_code, ''),
  'country', 'India'
)
FROM profiles p
WHERE queue_orders.user_id = p.id
  AND (queue_orders.delivery_address = '{}' OR queue_orders.delivery_address IS NULL)
  AND p.address_line1 IS NOT NULL;

-- STEP 4: Verify the fix
SELECT 
  'After Fix - Total Queue Orders' as status,
  COUNT(*) as count
FROM queue_orders
UNION ALL
SELECT 
  'After Fix - Missing Addresses' as status,
  COUNT(*) as count
FROM queue_orders 
WHERE delivery_address = '{}' OR delivery_address IS NULL
UNION ALL
SELECT 
  'After Fix - Valid Addresses' as status,
  COUNT(*) as count
FROM queue_orders 
WHERE delivery_address != '{}' AND delivery_address IS NOT NULL; 