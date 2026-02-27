-- Make phone field optional in custom_users
ALTER TABLE public.custom_users
ALTER COLUMN phone DROP NOT NULL;

-- Drop and recreate the foreign key constraint as deferrable
ALTER TABLE public.payment_orders
DROP CONSTRAINT IF EXISTS payment_orders_user_id_fkey;

ALTER TABLE public.payment_orders
ADD CONSTRAINT payment_orders_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.custom_users(id)
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED; 