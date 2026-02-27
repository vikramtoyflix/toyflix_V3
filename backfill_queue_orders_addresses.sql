-- 🔧 BACKFILL QUEUE ORDERS MISSING ADDRESSES
-- Similar to rental_orders, queue_orders also have empty delivery_address fields

-- 1️⃣ First, analyze which queue orders need backfilling
SELECT 
    qo.id,
    qo.order_number,
    cu.phone,
    cu.first_name,
    cu.last_name,
    qo.queue_order_type,
    -- Check if queue order has empty delivery address
    CASE 
        WHEN qo.delivery_address = '{}'::jsonb OR qo.delivery_address IS NULL THEN 'NEEDS_BACKFILL'
        WHEN qo.delivery_address->>'address_line1' IS NULL THEN 'NEEDS_BACKFILL' 
        ELSE 'HAS_ADDRESS'
    END as address_status,
    -- User profile address availability
    CASE 
        WHEN cu.address_line1 IS NOT NULL AND cu.city IS NOT NULL THEN 'PROFILE_AVAILABLE'
        ELSE 'NO_PROFILE_ADDRESS'
    END as profile_status,
    qo.created_at
FROM queue_orders qo
LEFT JOIN custom_users cu ON qo.user_id = cu.id
WHERE qo.created_at >= '2025-08-01'
ORDER BY qo.created_at DESC;

-- 2️⃣ Count queue orders that can be backfilled
SELECT 
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
    END) as cannot_backfill,
    COUNT(CASE 
        WHEN qo.delivery_address->>'address_line1' IS NOT NULL
        THEN 1 
    END) as already_have_address
FROM queue_orders qo
LEFT JOIN custom_users cu ON qo.user_id = cu.id
WHERE qo.created_at >= '2025-08-01';

-- 3️⃣ BACKUP: Create a backup of current queue order addresses before updating
CREATE TABLE IF NOT EXISTS queue_orders_address_backup AS
SELECT 
    id,
    order_number,
    user_id,
    queue_order_type,
    delivery_address,
    created_at,
    NOW() as backup_created_at
FROM queue_orders
WHERE created_at >= '2025-08-01'
  AND (delivery_address = '{}'::jsonb OR delivery_address IS NULL OR delivery_address->>'address_line1' IS NULL);

-- 4️⃣ UPDATE: Backfill missing delivery addresses from user profiles
UPDATE queue_orders 
SET 
    delivery_address = jsonb_build_object(
        'first_name', COALESCE(cu.first_name, ''),
        'last_name', COALESCE(cu.last_name, ''),
        'phone', COALESCE(cu.phone, ''),
        'email', COALESCE(cu.email, ''),
        'address_line1', COALESCE(cu.address_line1, ''),
        'address_line2', COALESCE(cu.address_line2, ''),
        'city', COALESCE(cu.city, ''),
        'state', COALESCE(cu.state, ''),
        'postcode', COALESCE(cu.zip_code, ''),
        'country', 'India',
        'latitude', NULL,
        'longitude', NULL,
        'plus_code', NULL,
        'delivery_instructions', delivery_instructions -- Keep existing instructions
    ),
    updated_at = NOW()
FROM custom_users cu
WHERE queue_orders.user_id = cu.id
  AND queue_orders.created_at >= '2025-08-01'
  AND (queue_orders.delivery_address = '{}'::jsonb 
       OR queue_orders.delivery_address IS NULL 
       OR queue_orders.delivery_address->>'address_line1' IS NULL)
  AND cu.address_line1 IS NOT NULL
  AND cu.city IS NOT NULL;

-- 5️⃣ VERIFICATION: Check results after backfilling
SELECT 
    'AFTER_QUEUE_BACKFILL' as status,
    COUNT(*) as total_queue_orders,
    COUNT(CASE WHEN qo.delivery_address->>'address_line1' IS NOT NULL THEN 1 END) as orders_with_address,
    COUNT(CASE WHEN qo.delivery_address = '{}'::jsonb OR qo.delivery_address->>'address_line1' IS NULL THEN 1 END) as orders_still_missing_address,
    ROUND(100.0 * COUNT(CASE WHEN qo.delivery_address->>'address_line1' IS NOT NULL THEN 1 END) / COUNT(*), 1) as address_completion_rate
FROM queue_orders qo
WHERE qo.created_at >= '2025-08-01';

-- 6️⃣ Show sample backfilled queue order addresses for verification
SELECT 
    qo.order_number,
    qo.queue_order_type,
    cu.phone,
    cu.first_name || ' ' || cu.last_name as customer_name,
    qo.delivery_address->>'address_line1' as backfilled_address1,
    qo.delivery_address->>'city' as backfilled_city,
    qo.delivery_address->>'postcode' as backfilled_postcode,
    qo.updated_at as backfilled_at
FROM queue_orders qo
LEFT JOIN custom_users cu ON qo.user_id = cu.id
WHERE qo.created_at >= '2025-08-01'
  AND qo.updated_at > qo.created_at  -- Recently updated
  AND qo.delivery_address->>'address_line1' IS NOT NULL
ORDER BY qo.updated_at DESC
LIMIT 10;

-- 7️⃣ Show queue orders that still couldn't be backfilled (need manual attention)
SELECT 
    qo.order_number,
    qo.queue_order_type,
    cu.phone,
    cu.first_name || ' ' || cu.last_name as customer_name,
    'Missing profile address - needs manual update' as issue,
    qo.created_at
FROM queue_orders qo
LEFT JOIN custom_users cu ON qo.user_id = cu.id
WHERE qo.created_at >= '2025-08-01'
  AND (qo.delivery_address = '{}'::jsonb OR qo.delivery_address->>'address_line1' IS NULL)
  AND (cu.address_line1 IS NULL OR cu.city IS NULL)
ORDER BY qo.created_at DESC;
