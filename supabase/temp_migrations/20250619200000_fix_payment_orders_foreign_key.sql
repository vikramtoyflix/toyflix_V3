-- Drop the existing foreign key constraint
ALTER TABLE payment_orders DROP CONSTRAINT IF EXISTS payment_orders_user_id_fkey;

-- Add new foreign key constraint to reference custom_users
ALTER TABLE payment_orders ADD CONSTRAINT payment_orders_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES custom_users(id) ON DELETE CASCADE; 