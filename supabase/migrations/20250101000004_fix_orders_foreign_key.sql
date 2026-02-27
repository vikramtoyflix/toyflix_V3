-- Fix orders table foreign key constraint to reference custom_users
-- This resolves the "orders_user_id_fkey" constraint violation error when creating free orders

-- Step 1: Drop any existing foreign key constraint on orders.user_id
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- Step 2: Add the correct foreign key constraint pointing to custom_users
ALTER TABLE public.orders 
ADD CONSTRAINT orders_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.custom_users(id) 
ON DELETE CASCADE;

-- Step 3: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- Step 4: Add comment for documentation
COMMENT ON CONSTRAINT orders_user_id_fkey ON public.orders IS 'Orders are linked to custom_users table, not auth.users'; 