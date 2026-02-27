-- Create payment_tracking table for simple payment tracking without foreign key constraints
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_tracking_razorpay_order_id ON payment_tracking(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_user_id ON payment_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_status ON payment_tracking(status);

-- Create trigger for updated_at
CREATE TRIGGER update_payment_tracking_updated_at 
  BEFORE UPDATE ON payment_tracking 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 