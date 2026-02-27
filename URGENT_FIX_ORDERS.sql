-- URGENT FIX: Run this in your Supabase SQL Editor to fix the free order creation error
-- This fixes the "orders_user_id_fkey" constraint violation

-- 1. Drop the problematic foreign key constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- 2. Add the correct foreign key constraint pointing to custom_users
ALTER TABLE public.orders 
ADD CONSTRAINT orders_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.custom_users(id) 
ON DELETE CASCADE;

-- 3. Create performance index
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- Done! Now free orders with coupons should work. 