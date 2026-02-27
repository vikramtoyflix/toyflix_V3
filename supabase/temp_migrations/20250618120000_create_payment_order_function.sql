-- Create a function to handle payment order creation
CREATE OR REPLACE FUNCTION public.create_payment_order(
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
  -- Check if user exists in custom_users
  IF EXISTS (SELECT 1 FROM public.custom_users WHERE id = p_user_id) THEN
    -- Insert into payment_orders
    INSERT INTO public.payment_orders (
      user_id,
      razorpay_order_id,
      amount,
      currency,
      status,
      order_type,
      order_items
    ) VALUES (
      p_user_id,
      p_razorpay_order_id,
      p_amount,
      p_currency,
      'created',
      p_order_type,
      p_order_items
    )
    RETURNING id INTO v_order_id;
    
    RETURN v_order_id;
  ELSE
    -- If not in custom_users, check auth.users
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
      -- Create user in custom_users first
      INSERT INTO public.custom_users (id, phone, email)
      SELECT id, phone, email
      FROM auth.users
      WHERE id = p_user_id;
      
      -- Then insert into payment_orders
      INSERT INTO public.payment_orders (
        user_id,
        razorpay_order_id,
        amount,
        currency,
        status,
        order_type,
        order_items
      ) VALUES (
        p_user_id,
        p_razorpay_order_id,
        p_amount,
        p_currency,
        'created',
        p_order_type,
        p_order_items
      )
      RETURNING id INTO v_order_id;
      
      RETURN v_order_id;
    ELSE
      RAISE EXCEPTION 'User not found in either custom_users or auth.users';
    END IF;
  END IF;
END;
$$; 