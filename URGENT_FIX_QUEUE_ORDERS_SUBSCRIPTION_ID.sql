-- ============================================
-- 🚨 URGENT FIX: Queue Orders Subscription ID Foreign Key
-- ============================================
-- Run this in your Supabase SQL Editor to fix the foreign key constraint error
-- Error: "queue_orders_original_subscription_id_fkey" constraint violation

-- 1. Drop the problematic foreign key constraint if it exists
ALTER TABLE public.queue_orders DROP CONSTRAINT IF EXISTS queue_orders_original_subscription_id_fkey;

-- 2. Make sure the original_subscription_id column allows NULL values
ALTER TABLE public.queue_orders ALTER COLUMN original_subscription_id DROP NOT NULL;

-- 3. Add the corrected foreign key constraint that properly allows NULL values
ALTER TABLE public.queue_orders 
ADD CONSTRAINT queue_orders_original_subscription_id_fkey 
FOREIGN KEY (original_subscription_id) 
REFERENCES public.subscriptions(id) 
ON DELETE SET NULL;

-- 4. If the subscriptions table doesn't exist, create a minimal one for compatibility
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    plan_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Add an index for performance
CREATE INDEX IF NOT EXISTS idx_queue_orders_original_subscription_id 
ON public.queue_orders(original_subscription_id);

-- 6. Add helpful comment
COMMENT ON CONSTRAINT queue_orders_original_subscription_id_fkey ON public.queue_orders IS 
'Queue orders can optionally reference a subscription, but many queue orders may not have a related subscription (NULL is allowed)';

-- 7. Test the fix by checking the constraint
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'queue_orders'
    AND kcu.column_name = 'original_subscription_id';

-- Expected result: Should show the constraint allows NULL values and has ON DELETE SET NULL 