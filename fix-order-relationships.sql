-- Fix Order Items to Toys Relationship Issues
-- This script resolves the "more than one relationship" error

-- Step 1: Check current foreign key relationships
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'order_items'
  AND ccu.table_name = 'toys';

-- Step 2: Drop problematic foreign key constraint if it exists
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS order_items_ride_on_toy_id_fkey;

-- Step 3: Recreate with proper naming to avoid conflicts
ALTER TABLE order_items 
ADD CONSTRAINT order_items_ride_on_toy_fkey 
FOREIGN KEY (ride_on_toy_id) REFERENCES toys(id);

-- Step 4: Ensure main toy_id relationship is properly named
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS order_items_toy_id_fkey;

ALTER TABLE order_items 
ADD CONSTRAINT order_items_main_toy_fkey 
FOREIGN KEY (toy_id) REFERENCES toys(id);

-- Step 5: Test the fix
SELECT 
    oi.id,
    oi.order_id,
    oi.toy_id,
    oi.ride_on_toy_id,
    t1.name as main_toy_name,
    t2.name as ride_on_toy_name
FROM order_items oi
LEFT JOIN toys t1 ON oi.toy_id = t1.id
LEFT JOIN toys t2 ON oi.ride_on_toy_id = t2.id
LIMIT 5;

-- Step 6: Create a view for clean order data access
CREATE OR REPLACE VIEW order_details_view AS
SELECT 
    o.id as order_id,
    o.user_id,
    o.status,
    o.total_amount,
    o.created_at,
    o.shipping_address,
    oi.id as item_id,
    oi.toy_id,
    oi.quantity,
    oi.subscription_category,
    t.name as toy_name,
    t.category as toy_category,
    t.image_url as toy_image
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN toys t ON oi.toy_id = t.id;

COMMENT ON VIEW order_details_view IS 'Clean view for order data without relationship conflicts'; 