-- ============================================
-- 🚨 URGENT FIX: Queue Orders Foreign Key
-- ============================================
-- Run this in your Supabase SQL Editor to fix the foreign key constraint error
-- Error: "queue_orders_user_id_fkey" constraint violation

-- 1. Drop the problematic foreign key constraint
ALTER TABLE public.queue_orders DROP CONSTRAINT IF EXISTS queue_orders_user_id_fkey;

-- 2. Drop the created_by foreign key constraint as well (if it exists)
ALTER TABLE public.queue_orders DROP CONSTRAINT IF EXISTS queue_orders_created_by_fkey;

-- 3. Add the correct foreign key constraint pointing to custom_users
ALTER TABLE public.queue_orders 
ADD CONSTRAINT queue_orders_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.custom_users(id) 
ON DELETE CASCADE;

-- 4. Add the correct created_by foreign key constraint (optional)
ALTER TABLE public.queue_orders 
ADD CONSTRAINT queue_orders_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.custom_users(id) 
ON DELETE SET NULL;

-- 5. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_queue_orders_user_id ON public.queue_orders(user_id);

-- ✅ Done! Now AdminOrderCreationModal should work without foreign key errors. 