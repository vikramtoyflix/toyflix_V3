-- 🔍 DEBUG: Queue Orders Address Issue Investigation
-- Queue orders handle next cycle toy selections and subscription modifications

-- 1️⃣ Check recent queue orders with address data
SELECT 
    qo.id as queue_order_id,
    qo.order_number,
    qo.user_id,
    cu.phone,
    cu.first_name,
    cu.last_name,
    qo.queue_order_type,
    qo.delivery_address,
    -- Show different ways address might be stored in queue orders
    qo.delivery_address->>'address_line1' as address_line1,
    qo.delivery_address->>'address1' as address1,  
    qo.delivery_address->>'city' as city,
    qo.delivery_address->>'state' as state,
    qo.delivery_address->>'postcode' as postcode,
    qo.delivery_address->>'zip_code' as zip_code,
    qo.created_at
FROM queue_orders qo
LEFT JOIN custom_users cu ON qo.user_id = cu.id
WHERE qo.created_at >= '2025-09-01'
ORDER BY qo.created_at DESC
LIMIT 10;

-- 2️⃣ Check queue orders with NULL or empty delivery addresses
SELECT 
    COUNT(*) as total_queue_orders,
    COUNT(CASE WHEN qo.delivery_address IS NOT NULL THEN 1 END) as orders_with_address,
    COUNT(CASE WHEN qo.delivery_address->>'address_line1' IS NOT NULL 
               OR qo.delivery_address->>'address1' IS NOT NULL 
          THEN 1 END) as orders_with_street_address,
    COUNT(CASE WHEN qo.delivery_address = '{}'::jsonb 
               OR qo.delivery_address IS NULL 
          THEN 1 END) as orders_with_empty_address
FROM queue_orders qo
WHERE qo.created_at >= '2025-08-01';

-- 3️⃣ Check queue order types and their address completion
SELECT 
    qo.queue_order_type,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN qo.delivery_address->>'address_line1' IS NOT NULL THEN 1 END) as with_addresses,
    COUNT(CASE WHEN qo.delivery_address = '{}'::jsonb THEN 1 END) as empty_addresses,
    ROUND(100.0 * COUNT(CASE WHEN qo.delivery_address->>'address_line1' IS NOT NULL THEN 1 END) / COUNT(*), 1) as address_completion_rate
FROM queue_orders qo
WHERE qo.created_at >= '2025-08-01'
GROUP BY qo.queue_order_type
ORDER BY total_orders DESC;

-- 4️⃣ Compare queue orders vs user profiles for address availability
SELECT 
    qo.order_number,
    cu.phone,
    cu.first_name || ' ' || cu.last_name as customer_name,
    -- Queue order address status
    CASE 
        WHEN qo.delivery_address = '{}'::jsonb OR qo.delivery_address IS NULL THEN 'NEEDS_BACKFILL'
        WHEN qo.delivery_address->>'address_line1' IS NULL THEN 'NEEDS_BACKFILL' 
        ELSE 'HAS_ADDRESS'
    END as queue_address_status,
    -- User profile address availability
    CASE 
        WHEN cu.address_line1 IS NOT NULL AND cu.city IS NOT NULL THEN 'PROFILE_AVAILABLE'
        ELSE 'NO_PROFILE_ADDRESS'
    END as profile_status,
    qo.queue_order_type,
    qo.created_at
FROM queue_orders qo
LEFT JOIN custom_users cu ON qo.user_id = cu.id
WHERE qo.created_at >= '2025-08-01'
ORDER BY qo.created_at DESC;

-- 5️⃣ Show queue orders that can be backfilled vs need manual collection
SELECT 
    'BACKFILL_ANALYSIS' as analysis_type,
    COUNT(*) as total_queue_orders,
    COUNT(CASE 
        WHEN (qo.delivery_address = '{}'::jsonb OR qo.delivery_address IS NULL OR qo.delivery_address->>'address_line1' IS NULL)
        AND cu.address_line1 IS NOT NULL 
        AND cu.city IS NOT NULL 
        THEN 1 
    END) as can_backfill,
    COUNT(CASE 
        WHEN (qo.delivery_address = '{}'::jsonb OR qo.delivery_address IS NULL OR qo.delivery_address->>'address_line1' IS NULL)
        AND (cu.address_line1 IS NULL OR cu.city IS NULL)
        THEN 1 
    END) as need_manual_collection
FROM queue_orders qo
LEFT JOIN custom_users cu ON qo.user_id = cu.id
WHERE qo.created_at >= '2025-08-01';

-- 6️⃣ Show sample complete vs incomplete queue order addresses
(
SELECT 'COMPLETE_QUEUE_ADDRESS' as address_type, qo.id, qo.order_number, qo.delivery_address
FROM queue_orders qo
WHERE qo.delivery_address IS NOT NULL
  AND qo.delivery_address->>'address_line1' IS NOT NULL
  AND qo.delivery_address->>'city' IS NOT NULL
  AND qo.created_at >= '2025-08-01'
LIMIT 3
)
UNION ALL
(
SELECT 'INCOMPLETE_QUEUE_ADDRESS' as address_type, qo.id, qo.order_number, qo.delivery_address
FROM queue_orders qo
WHERE qo.delivery_address IS NOT NULL
  AND (qo.delivery_address->>'address_line1' IS NULL
       OR qo.delivery_address->>'city' IS NULL)
  AND qo.created_at >= '2025-08-01'
LIMIT 3
);
