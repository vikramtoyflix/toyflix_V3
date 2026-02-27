-- ========================================
-- FIX QUEUE_ORDERS FOREIGN KEY CONSTRAINT
-- ========================================
-- This fixes the foreign key constraint violation error when creating queue orders
-- The queue_orders table should reference custom_users, not auth.users

-- Step 1: Drop the problematic foreign key constraint
ALTER TABLE public.queue_orders DROP CONSTRAINT IF EXISTS queue_orders_user_id_fkey;

-- Step 2: Drop the created_by foreign key constraint as well (if it exists)
ALTER TABLE public.queue_orders DROP CONSTRAINT IF EXISTS queue_orders_created_by_fkey;

-- Step 3: Add the correct foreign key constraint pointing to custom_users
ALTER TABLE public.queue_orders 
ADD CONSTRAINT queue_orders_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.custom_users(id) 
ON DELETE CASCADE;

-- Step 4: Add the correct created_by foreign key constraint (optional)
ALTER TABLE public.queue_orders 
ADD CONSTRAINT queue_orders_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.custom_users(id) 
ON DELETE SET NULL;

-- Step 5: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_queue_orders_user_id ON public.queue_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_orders_created_by ON public.queue_orders(created_by);

-- Step 6: Add helpful comment
COMMENT ON CONSTRAINT queue_orders_user_id_fkey ON public.queue_orders IS 'Queue orders are linked to custom_users table, not auth.users';

-- Step 7: Update any existing queue orders that might have invalid user_ids (cleanup)
-- This removes any orphaned queue orders that don't have matching users
DELETE FROM public.queue_orders 
WHERE user_id NOT IN (SELECT id FROM public.custom_users);

-- Verify the fix
-- SELECT 
--   tc.constraint_name, 
--   tc.table_name, 
--   kcu.column_name, 
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name 
-- FROM 
--   information_schema.table_constraints AS tc 
--   JOIN information_schema.key_column_usage AS kcu
--     ON tc.constraint_name = kcu.constraint_name
--   JOIN information_schema.constraint_column_usage AS ccu
--     ON ccu.constraint_name = tc.constraint_name
-- WHERE constraint_type = 'FOREIGN KEY' 
--   AND tc.table_name='queue_orders'
--   AND kcu.column_name = 'user_id'; 