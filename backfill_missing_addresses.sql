-- 🔧 BACKFILL MISSING SHIPPING ADDRESSES
-- This script updates existing orders that have empty shipping_address
-- with addresses from user profiles

-- 1️⃣ First, let's see which orders need backfilling
SELECT 
    ro.id,
    ro.order_number,
    cu.phone,
    cu.first_name,
    cu.last_name,
    -- Check if order has empty shipping address
    CASE 
        WHEN ro.shipping_address = '{}'::jsonb OR ro.shipping_address IS NULL THEN 'NEEDS_BACKFILL'
        WHEN ro.shipping_address->>'address_line1' IS NULL THEN 'NEEDS_BACKFILL' 
        ELSE 'HAS_ADDRESS'
    END as address_status,
    -- User profile address availability
    CASE 
        WHEN cu.address_line1 IS NOT NULL AND cu.city IS NOT NULL THEN 'PROFILE_AVAILABLE'
        ELSE 'NO_PROFILE_ADDRESS'
    END as profile_status,
    ro.created_at
FROM rental_orders ro
LEFT JOIN custom_users cu ON ro.user_id = cu.id
WHERE ro.created_at >= '2025-09-01'
ORDER BY ro.created_at DESC;

-- 2️⃣ Count orders that can be backfilled
SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE 
        WHEN (ro.shipping_address = '{}'::jsonb OR ro.shipping_address IS NULL OR ro.shipping_address->>'address_line1' IS NULL)
        AND cu.address_line1 IS NOT NULL 
        AND cu.city IS NOT NULL 
        THEN 1 
    END) as can_backfill,
    COUNT(CASE 
        WHEN (ro.shipping_address = '{}'::jsonb OR ro.shipping_address IS NULL OR ro.shipping_address->>'address_line1' IS NULL)
        AND (cu.address_line1 IS NULL OR cu.city IS NULL)
        THEN 1 
    END) as cannot_backfill
FROM rental_orders ro
LEFT JOIN custom_users cu ON ro.user_id = cu.id
WHERE ro.created_at >= '2025-09-01';

-- 3️⃣ BACKUP: Create a backup of current shipping addresses before updating
CREATE TABLE IF NOT EXISTS rental_orders_address_backup AS
SELECT 
    id,
    order_number,
    user_id,
    shipping_address,
    created_at,
    NOW() as backup_created_at
FROM rental_orders
WHERE created_at >= '2025-09-01'
  AND (shipping_address = '{}'::jsonb OR shipping_address IS NULL OR shipping_address->>'address_line1' IS NULL);

-- 4️⃣ UPDATE: Backfill missing shipping addresses from user profiles
UPDATE rental_orders 
SET 
    shipping_address = jsonb_build_object(
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
        'delivery_instructions', NULL
    ),
    updated_at = NOW()
FROM custom_users cu
WHERE rental_orders.user_id = cu.id
  AND rental_orders.created_at >= '2025-09-01'
  AND (rental_orders.shipping_address = '{}'::jsonb 
       OR rental_orders.shipping_address IS NULL 
       OR rental_orders.shipping_address->>'address_line1' IS NULL)
  AND cu.address_line1 IS NOT NULL
  AND cu.city IS NOT NULL;

-- 5️⃣ VERIFICATION: Check results after backfilling
SELECT 
    'AFTER_BACKFILL' as status,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN ro.shipping_address->>'address_line1' IS NOT NULL THEN 1 END) as orders_with_address,
    COUNT(CASE WHEN ro.shipping_address = '{}'::jsonb OR ro.shipping_address->>'address_line1' IS NULL THEN 1 END) as orders_still_missing_address
FROM rental_orders ro
WHERE ro.created_at >= '2025-09-01';

-- 6️⃣ Show sample backfilled addresses for verification
SELECT 
    ro.order_number,
    cu.phone,
    cu.first_name || ' ' || cu.last_name as customer_name,
    ro.shipping_address->>'address_line1' as backfilled_address1,
    ro.shipping_address->>'city' as backfilled_city,
    ro.shipping_address->>'postcode' as backfilled_postcode,
    ro.updated_at as backfilled_at
FROM rental_orders ro
LEFT JOIN custom_users cu ON ro.user_id = cu.id
WHERE ro.created_at >= '2025-09-01'
  AND ro.updated_at > ro.created_at  -- Recently updated
  AND ro.shipping_address->>'address_line1' IS NOT NULL
ORDER BY ro.updated_at DESC
LIMIT 10;

-- 7️⃣ Show orders that still couldn't be backfilled (need manual attention)
SELECT 
    ro.order_number,
    cu.phone,
    cu.first_name || ' ' || cu.last_name as customer_name,
    'Missing profile address - needs manual update' as issue,
    ro.created_at
FROM rental_orders ro
LEFT JOIN custom_users cu ON ro.user_id = cu.id
WHERE ro.created_at >= '2025-09-01'
  AND (ro.shipping_address = '{}'::jsonb OR ro.shipping_address->>'address_line1' IS NULL)
  AND (cu.address_line1 IS NULL OR cu.city IS NULL)
ORDER BY ro.created_at DESC;
