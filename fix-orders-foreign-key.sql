-- Fix orders table foreign key constraint to reference custom_users
-- This resolves the "orders_user_id_fkey" constraint violation error

-- Step 1: Drop any existing foreign key constraint on orders.user_id
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- Step 2: Add the correct foreign key constraint pointing to custom_users
ALTER TABLE public.orders 
ADD CONSTRAINT orders_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.custom_users(id) 
ON DELETE CASCADE;

-- Step 3: Ensure any existing orders have valid user_ids
-- (This will help catch any orphaned orders)
UPDATE public.orders 
SET user_id = (
  SELECT id FROM public.custom_users 
  WHERE custom_users.id = orders.user_id 
  LIMIT 1
)
WHERE user_id NOT IN (SELECT id FROM public.custom_users);

-- Step 4: Also fix order_items foreign key if needed
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_user_id_fkey;

-- Step 5: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- Step 6: Ensure custom_users table has proper constraints
ALTER TABLE public.custom_users ALTER COLUMN id SET NOT NULL;

-- Step 7: Add comment for documentation
COMMENT ON CONSTRAINT orders_user_id_fkey ON public.orders IS 'Orders are linked to custom_users table, not auth.users'; 