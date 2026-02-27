-- 🔍 DEBUG: Address Issue Investigation
-- Run this query to understand why complete addresses are not showing in orders

-- 1️⃣ Check recent rental orders with shipping address data
SELECT 
    ro.id as order_id,
    ro.order_number,
    ro.user_id,
    cu.phone,
    cu.first_name,
    cu.last_name,
    ro.shipping_address,
    -- Show different ways address might be stored (using PostgreSQL JSONB operators)
    ro.shipping_address->>'address_line1' as address_line1,
    ro.shipping_address->>'address1' as address1,  
    ro.shipping_address->>'address_line2' as address_line2,
    ro.shipping_address->>'apartment' as apartment,
    ro.shipping_address->>'city' as city,
    ro.shipping_address->>'state' as state,
    ro.shipping_address->>'postcode' as postcode,
    ro.shipping_address->>'zip_code' as zip_code,
    ro.shipping_address->>'postal_code' as postal_code,
    ro.created_at
FROM rental_orders ro
LEFT JOIN custom_users cu ON ro.user_id = cu.id
WHERE ro.created_at >= '2025-09-01'
ORDER BY ro.created_at DESC
LIMIT 10;

-- 2️⃣ Check orders with NULL or empty shipping addresses
SELECT 
    COUNT(*) as orders_with_null_address,
    COUNT(CASE WHEN ro.shipping_address IS NOT NULL THEN 1 END) as orders_with_address,
    COUNT(CASE WHEN ro.shipping_address->>'address_line1' IS NOT NULL 
               OR ro.shipping_address->>'address1' IS NOT NULL 
          THEN 1 END) as orders_with_street_address
FROM rental_orders ro
WHERE ro.created_at >= '2025-09-01';

-- 3️⃣ Check address field variations in the database
SELECT DISTINCT
    jsonb_object_keys(ro.shipping_address) as address_fields_present
FROM rental_orders ro
WHERE ro.shipping_address IS NOT NULL
  AND ro.created_at >= '2025-08-01'
LIMIT 15;

-- 4️⃣ Check user profile addresses vs order addresses
SELECT 
    cu.id as user_id,
    cu.phone,
    cu.address_line1 as profile_address1,
    cu.address_line2 as profile_address2,
    cu.city as profile_city,
    cu.state as profile_state,
    cu.zip_code as profile_zipcode,
    ro.shipping_address as order_address,
    ro.created_at
FROM custom_users cu
LEFT JOIN rental_orders ro ON cu.id = ro.user_id
WHERE cu.created_at >= '2025-09-01' 
   OR ro.created_at >= '2025-09-01'
ORDER BY cu.created_at DESC, ro.created_at DESC
LIMIT 10;

-- 5️⃣ Check if customer_addresses table has data
SELECT 
    COUNT(*) as total_customer_addresses,
    COUNT(CASE WHEN address_line_1 IS NOT NULL THEN 1 END) as addresses_with_line1,
    COUNT(CASE WHEN city IS NOT NULL THEN 1 END) as addresses_with_city,
    COUNT(CASE WHEN is_default = true THEN 1 END) as default_addresses
FROM customer_addresses
WHERE created_at >= '2025-08-01';

-- 6️⃣ Show sample complete vs incomplete addresses
(
SELECT 'COMPLETE_ADDRESS' as address_type, ro.id, ro.order_number, ro.shipping_address
FROM rental_orders ro
WHERE ro.shipping_address IS NOT NULL
  AND ro.shipping_address->>'address_line1' IS NOT NULL
  AND ro.shipping_address->>'city' IS NOT NULL
  AND ro.created_at >= '2025-08-01'
LIMIT 3
)
UNION ALL
(
SELECT 'INCOMPLETE_ADDRESS' as address_type, ro.id, ro.order_number, ro.shipping_address
FROM rental_orders ro
WHERE ro.shipping_address IS NOT NULL
  AND (ro.shipping_address->>'address_line1' IS NULL
       OR ro.shipping_address->>'city' IS NULL)
  AND ro.created_at >= '2025-08-01'
LIMIT 3
);
