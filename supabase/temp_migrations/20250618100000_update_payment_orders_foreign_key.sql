-- First, drop the existing foreign key constraint
ALTER TABLE public.payment_orders
DROP CONSTRAINT IF EXISTS payment_orders_user_id_fkey;

-- Add the new foreign key constraint pointing to custom_users
ALTER TABLE public.payment_orders
ADD CONSTRAINT payment_orders_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.custom_users(id)
ON DELETE CASCADE; 