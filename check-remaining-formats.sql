-- Check what phone formats still remain in rental_orders after cleanup

-- Show detailed breakdown of remaining formats
SELECT 
    'Detailed Format Analysis' as info,
    user_phone,
    LENGTH(user_phone) as length,
    CASE 
        WHEN user_phone LIKE '+91%' THEN 'With +91 prefix'
        WHEN user_phone LIKE '91%' AND LENGTH(user_phone) = 12 THEN 'With 91 prefix'
        WHEN LENGTH(user_phone) = 10 AND user_phone ~ '^[0-9]+$' THEN '10 digits clean'
        WHEN user_phone ~ '^[0-9]+$' THEN 'Numbers only - wrong length'
        ELSE 'Contains non-numeric'
    END as format_type,
    COUNT(*) as count
FROM rental_orders 
WHERE user_phone IS NOT NULL
GROUP BY user_phone, LENGTH(user_phone), 
    CASE 
        WHEN user_phone LIKE '+91%' THEN 'With +91 prefix'
        WHEN user_phone LIKE '91%' AND LENGTH(user_phone) = 12 THEN 'With 91 prefix'
        WHEN LENGTH(user_phone) = 10 AND user_phone ~ '^[0-9]+$' THEN '10 digits clean'
        WHEN user_phone ~ '^[0-9]+$' THEN 'Numbers only - wrong length'
        ELSE 'Contains non-numeric'
    END
ORDER BY format_type, count DESC;

-- Show problematic entries that need additional cleanup
SELECT 
    'Problematic Entries Needing Cleanup' as info,
    user_phone,
    LENGTH(user_phone) as length,
    COUNT(*) as order_count,
    array_agg(DISTINCT order_number) as sample_orders
FROM rental_orders 
WHERE user_phone IS NOT NULL 
AND (
    LENGTH(user_phone) != 10 
    OR user_phone !~ '^[0-9]+$'
    OR user_phone LIKE '+91%'
    OR (user_phone LIKE '91%' AND LENGTH(user_phone) = 12)
)
GROUP BY user_phone, LENGTH(user_phone)
ORDER BY order_count DESC
LIMIT 20;

-- Verify our test phone number is clean
SELECT 
    'Test Phone Status' as info,
    user_phone,
    LENGTH(user_phone) as length,
    COUNT(*) as order_count
FROM rental_orders 
WHERE user_phone = '9945813680';
