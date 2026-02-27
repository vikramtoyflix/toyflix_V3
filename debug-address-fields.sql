-- Debug query to check address fields in different order types
-- Run this in Supabase SQL Editor to verify address data structure

-- Check Queue Orders (QU orders) - delivery_address field
SELECT 
    'QUEUE_ORDER' as order_type,
    order_number,
    status,
    delivery_address,
    delivery_address->>'first_name' as first_name,
    delivery_address->>'last_name' as last_name,
    delivery_address->>'address_line_1' as address_line_1,
    delivery_address->>'address_line1' as address_line1_alt,
    delivery_address->>'city' as city,
    delivery_address->>'state' as state,
    delivery_address->>'postal_code' as postal_code,
    delivery_address->>'postcode' as postcode_alt,
    created_at
FROM queue_orders 
WHERE order_number LIKE 'QU-%'
ORDER BY created_at DESC 
LIMIT 5;

-- Check Rental Orders (SUB orders) - shipping_address field  
SELECT 
    'RENTAL_ORDER' as order_type,
    order_number,
    status,
    shipping_address,
    shipping_address->>'first_name' as first_name,
    shipping_address->>'last_name' as last_name,
    shipping_address->>'address_line_1' as address_line_1,
    shipping_address->>'address_line1' as address_line1_alt,
    shipping_address->>'city' as city,
    shipping_address->>'state' as state,
    shipping_address->>'postal_code' as postal_code,
    shipping_address->>'postcode' as postcode_alt,
    created_at
FROM rental_orders 
WHERE order_number LIKE 'SUB-%'
ORDER BY created_at DESC 
LIMIT 5;

-- Summary: Check if addresses exist
SELECT 
    'QUEUE_ORDERS' as table_name,
    COUNT(*) as total_orders,
    COUNT(delivery_address) as orders_with_address,
    COUNT(CASE WHEN delivery_address->>'address_line_1' != '' OR delivery_address->>'address_line1' != '' THEN 1 END) as orders_with_address_line
FROM queue_orders
UNION ALL
SELECT 
    'RENTAL_ORDERS' as table_name,
    COUNT(*) as total_orders,
    COUNT(shipping_address) as orders_with_address,
    COUNT(CASE WHEN shipping_address->>'address_line_1' != '' OR shipping_address->>'address_line1' != '' THEN 1 END) as orders_with_address_line
FROM rental_orders;

