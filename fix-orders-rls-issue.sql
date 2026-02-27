-- Fix RLS policies for orders table to allow authenticated users to access their own orders

-- Check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('orders', 'order_items', 'custom_users') 
ORDER BY tablename, policyname;

-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;

-- Create proper RLS policies for orders table
CREATE POLICY "authenticated_users_can_view_own_orders" ON orders
    FOR SELECT 
    TO authenticated
    USING (
        user_id = auth.uid()::text OR 
        user_id IN (
            SELECT id::text FROM custom_users WHERE id = auth.uid()
        )
    );

-- Create proper RLS policies for order_items table
CREATE POLICY "authenticated_users_can_view_own_order_items" ON order_items
    FOR SELECT 
    TO authenticated
    USING (
        order_id IN (
            SELECT id FROM orders WHERE 
            user_id = auth.uid()::text OR 
            user_id IN (
                SELECT id::text FROM custom_users WHERE id = auth.uid()
            )
        )
    );

-- Ensure RLS is enabled on the tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT ON orders TO authenticated;
GRANT SELECT ON order_items TO authenticated;
GRANT SELECT ON toys TO authenticated;
GRANT SELECT ON custom_users TO authenticated;

-- Test the policies
SELECT 'Testing orders access...' as test;
SELECT count(*) as order_count FROM orders WHERE user_id = '7e8dc7e4-31d6-4298-b0b4-4345612be6e2';

SELECT 'Testing order_items access...' as test;
SELECT count(*) as order_items_count FROM order_items 
WHERE order_id IN (
    SELECT id FROM orders WHERE user_id = '7e8dc7e4-31d6-4298-b0b4-4345612be6e2'
);

-- Show final policies
SELECT 'Final RLS policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('orders', 'order_items') 
ORDER BY tablename, policyname;
