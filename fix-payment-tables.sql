-- Fix payment tables manually
-- Run this in your Supabase SQL editor

-- 1. Create payment_tracking table with GST fields
CREATE TABLE IF NOT EXISTS payment_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    razorpay_order_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    base_amount DECIMAL(10,2) NOT NULL,
    gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'created',
    order_type TEXT NOT NULL,
    order_items JSONB,
    user_email TEXT,
    user_phone TEXT,
    razorpay_payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for payment_tracking
CREATE INDEX IF NOT EXISTS idx_payment_tracking_razorpay_order_id ON payment_tracking(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_user_id ON payment_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_status ON payment_tracking(status);

-- 3. Create trigger for updated_at (function should already exist)
CREATE TRIGGER update_payment_tracking_updated_at 
  BEFORE UPDATE ON payment_tracking 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Fix payment_orders foreign key constraint
ALTER TABLE payment_orders DROP CONSTRAINT IF EXISTS payment_orders_user_id_fkey;
ALTER TABLE payment_orders ADD CONSTRAINT payment_orders_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES custom_users(id) ON DELETE CASCADE;

-- 5. Make phone field optional in custom_users (if not already done)
ALTER TABLE custom_users ALTER COLUMN phone DROP NOT NULL;

-- 6. If payment_tracking table already exists, add GST columns
ALTER TABLE payment_tracking ADD COLUMN IF NOT EXISTS base_amount DECIMAL(10,2);
ALTER TABLE payment_tracking ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE payment_tracking ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2);

-- 7. Update existing records to have proper GST calculation (if any exist)
UPDATE payment_tracking 
SET 
    base_amount = amount,
    gst_amount = ROUND(amount * 0.18, 2),
    total_amount = amount + ROUND(amount * 0.18, 2)
WHERE base_amount IS NULL; 