-- Examine the shipping_address JSONB structure in rental_orders
SELECT 
    'Sample shipping_address data' as info,
    order_number,
    user_phone,
    shipping_address,
    shipping_address->>'name' as extracted_name,
    shipping_address->>'first_name' as first_name,
    shipping_address->>'last_name' as last_name,
    shipping_address->>'full_name' as full_name,
    shipping_address->>'address_1' as address_1,
    shipping_address->>'city' as city,
    shipping_address->>'state' as state,
    shipping_address->>'postcode' as postcode
FROM rental_orders 
WHERE shipping_address IS NOT NULL 
AND shipping_address != '{}'::jsonb
ORDER BY created_at DESC
LIMIT 10;

-- Check what keys are available in shipping_address JSONB
SELECT 
    'Available keys in shipping_address' as info,
    DISTINCT jsonb_object_keys(shipping_address) as keys,
    COUNT(*) as frequency
FROM rental_orders 
WHERE shipping_address IS NOT NULL 
AND shipping_address != '{}'::jsonb
GROUP BY jsonb_object_keys(shipping_address)
ORDER BY frequency DESC;

-- Check for specific phone number
SELECT 
    'Shipping data for phone 9945813680' as info,
    order_number,
    shipping_address,
    shipping_address->>'name' as name,
    shipping_address->>'first_name' as first_name,
    shipping_address->>'last_name' as last_name
FROM rental_orders 
WHERE user_phone = '9945813680'
AND shipping_address IS NOT NULL 
AND shipping_address != '{}'::jsonb
ORDER BY cycle_number DESC
LIMIT 5;
