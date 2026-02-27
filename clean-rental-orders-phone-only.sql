-- Clean and normalize phone number formats ONLY in rental_orders table
-- This will standardize all phone numbers to format: 9945813680 (10 digits without +91)
-- DO NOT touch custom_users table due to unique constraint

-- First, let's see the current phone format distribution in rental_orders
SELECT 
    'Current Phone Formats in rental_orders' as info,
    CASE 
        WHEN user_phone LIKE '+91%' THEN 'With +91 prefix'
        WHEN user_phone LIKE '91%' AND LENGTH(user_phone) = 12 THEN 'With 91 prefix'
        WHEN LENGTH(user_phone) = 10 THEN '10 digits clean'
        ELSE 'Other format'
    END as format_type,
    COUNT(*) as count,
    array_agg(DISTINCT user_phone) as sample_numbers
FROM rental_orders 
WHERE user_phone IS NOT NULL
GROUP BY 
    CASE 
        WHEN user_phone LIKE '+91%' THEN 'With +91 prefix'
        WHEN user_phone LIKE '91%' AND LENGTH(user_phone) = 12 THEN 'With 91 prefix'
        WHEN LENGTH(user_phone) = 10 THEN '10 digits clean'
        ELSE 'Other format'
    END
ORDER BY count DESC;

-- Normalize phone numbers to 10-digit format in rental_orders ONLY
UPDATE rental_orders 
SET user_phone = CASE
    -- Remove +91 prefix
    WHEN user_phone LIKE '+91%' THEN SUBSTRING(user_phone FROM 4)
    -- Remove 91 prefix if 12 digits (91xxxxxxxxxx)
    WHEN user_phone LIKE '91%' AND LENGTH(user_phone) = 12 THEN SUBSTRING(user_phone FROM 3)
    -- Keep as is if already 10 digits
    WHEN LENGTH(user_phone) = 10 AND user_phone ~ '^[0-9]+$' THEN user_phone
    -- Handle any other cases
    ELSE REGEXP_REPLACE(user_phone, '^(\+91|91)', '', 'g')
END
WHERE user_phone IS NOT NULL;

-- Verify the cleanup in rental_orders
SELECT 
    'After Cleanup - rental_orders' as info,
    COUNT(*) as total_orders,
    COUNT(DISTINCT user_phone) as unique_phones,
    MIN(LENGTH(user_phone)) as min_length,
    MAX(LENGTH(user_phone)) as max_length,
    array_agg(DISTINCT LENGTH(user_phone)) as all_lengths
FROM rental_orders 
WHERE user_phone IS NOT NULL;

-- Show sample of cleaned data
SELECT 
    'Sample Cleaned Data' as info,
    user_phone,
    COUNT(*) as order_count
FROM rental_orders 
WHERE user_phone IS NOT NULL
GROUP BY user_phone
ORDER BY order_count DESC
LIMIT 10;

-- Check for any problematic phone numbers (not 10 digits)
SELECT 
    'Problematic Phone Numbers' as info,
    user_phone,
    LENGTH(user_phone) as length,
    COUNT(*) as count
FROM rental_orders 
WHERE user_phone IS NOT NULL 
AND (LENGTH(user_phone) != 10 OR user_phone !~ '^[0-9]+$')
GROUP BY user_phone, LENGTH(user_phone)
ORDER BY count DESC;

-- Verify our specific test phone number
SELECT 
    'Test Phone 9945813680' as info,
    COUNT(*) as order_count,
    user_phone,
    array_agg(DISTINCT order_number ORDER BY order_number) as sample_orders
FROM rental_orders 
WHERE user_phone = '9945813680'
GROUP BY user_phone;

-- Show phone format comparison between tables
SELECT 
    'Phone Format Comparison' as info,
    'custom_users' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT phone) as unique_phones,
    array_agg(DISTINCT 
        CASE 
            WHEN phone LIKE '+91%' THEN 'With +91 prefix'
            WHEN phone LIKE '91%' AND LENGTH(phone) = 12 THEN 'With 91 prefix'
            WHEN LENGTH(phone) = 10 THEN '10 digits clean'
            ELSE 'Other format'
        END
    ) as formats_present
FROM custom_users 
WHERE phone IS NOT NULL

UNION ALL

SELECT 
    'Phone Format Comparison' as info,
    'rental_orders' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_phone) as unique_phones,
    array_agg(DISTINCT 
        CASE 
            WHEN user_phone LIKE '+91%' THEN 'With +91 prefix'
            WHEN user_phone LIKE '91%' AND LENGTH(user_phone) = 12 THEN 'With 91 prefix'
            WHEN LENGTH(user_phone) = 10 THEN '10 digits clean'
            ELSE 'Other format'
        END
    ) as formats_present
FROM rental_orders 
WHERE user_phone IS NOT NULL;
