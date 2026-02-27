-- Create a function to insert payment orders without foreign key constraints
CREATE OR REPLACE FUNCTION public.create_payment_order_raw(
  p_user_id UUID,
  p_razorpay_order_id TEXT,
  p_amount DECIMAL,
  p_currency TEXT,
  p_order_type TEXT,
  p_order_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
BEGIN
  -- Insert directly into payment_orders, bypassing foreign key constraints
  INSERT INTO public.payment_orders (
    user_id,
    razorpay_order_id,
    amount,
    currency,
    status,
    order_type,
    order_items,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_razorpay_order_id,
    p_amount,
    p_currency,
    'created',
    p_order_type,
    p_order_items,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_order_id;
  
  RETURN v_order_id;
END;
$$; 