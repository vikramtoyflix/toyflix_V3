-- Check Queue Order Address Status
-- Run this in Supabase SQL Editor to see address issues

-- 1. Count queue orders with/without addresses
SELECT 
  'Total Queue Orders' as category,
  COUNT(*) as count
FROM queue_orders
UNION ALL
SELECT 
  'Orders with Empty Addresses' as category,
  COUNT(*) as count  
FROM queue_orders 
WHERE delivery_address = '{}' OR delivery_address IS NULL
UNION ALL
SELECT 
  'Orders with Valid Addresses' as category,
  COUNT(*) as count
FROM queue_orders 
WHERE delivery_address != '{}' AND delivery_address IS NOT NULL;

-- 2. Show recent queue orders and their address status
SELECT 
  order_number,
  user_id,
  created_at::date as order_date,
  CASE 
    WHEN delivery_address = '{}' OR delivery_address IS NULL THEN 'NO_ADDRESS'
    WHEN jsonb_typeof(delivery_address) = 'object' AND jsonb_object_keys(delivery_address) IS NOT NULL THEN 'HAS_ADDRESS'
    ELSE 'UNKNOWN'
  END as address_status,
  CASE 
    WHEN delivery_address != '{}' AND delivery_address IS NOT NULL 
    THEN jsonb_extract_path_text(delivery_address, 'first_name') || ' ' || jsonb_extract_path_text(delivery_address, 'last_name')
    ELSE 'No Name'
  END as customer_name
FROM queue_orders 
ORDER BY created_at DESC 
LIMIT 20;

-- 3. Show sample address structure from a valid order
SELECT 
  'Sample Address Structure' as info,
  delivery_address
FROM queue_orders 
WHERE delivery_address != '{}' AND delivery_address IS NOT NULL
LIMIT 1;

-- 4. Find queue orders with missing addresses that could be fixed from profiles
SELECT 
  qo.order_number,
  qo.user_id,
  p.first_name,
  p.last_name,
  p.phone,
  p.address_line1,
  p.city,
  qo.created_at::date as order_date
FROM queue_orders qo
LEFT JOIN profiles p ON qo.user_id = p.id
WHERE (qo.delivery_address = '{}' OR qo.delivery_address IS NULL)
  AND p.address_line1 IS NOT NULL
ORDER BY qo.created_at DESC
LIMIT 10; 