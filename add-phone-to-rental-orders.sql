-- Add phone number column to rental_orders table
ALTER TABLE rental_orders 
ADD COLUMN IF NOT EXISTS user_phone TEXT;

-- Create index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_rental_orders_user_phone 
ON rental_orders(user_phone);

-- Update rental_orders with phone numbers from custom_users
UPDATE rental_orders 
SET user_phone = cu.phone
FROM custom_users cu
WHERE rental_orders.user_id = cu.id
AND rental_orders.user_phone IS NULL;

-- Verify the update
SELECT 
    'Updated Orders' as info,
    COUNT(*) as total_orders,
    COUNT(user_phone) as orders_with_phone,
    COUNT(DISTINCT user_phone) as unique_phones
FROM rental_orders;

-- Show sample data
SELECT 
    order_number,
    user_id,
    user_phone,
    cycle_number,
    status
FROM rental_orders 
WHERE user_phone IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- Check for the specific phone number
SELECT 
    'Orders for 9945813680' as info,
    COUNT(*) as order_count,
    MIN(cycle_number) as first_cycle,
    MAX(cycle_number) as latest_cycle
FROM rental_orders 
WHERE user_phone = '9945813680';
