-- Ensure payment_orders and payment_tracking exist for razorpay-order / razorpay-verify flow.
-- Safe to run multiple times (IF NOT EXISTS). Service role is used by Edge Functions; RLS not required for server-side only tables.

CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.custom_users(id) ON DELETE SET NULL,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'created',
    order_type TEXT NOT NULL,
    order_items JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_razorpay_order_id ON public.payment_orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status);

CREATE TABLE IF NOT EXISTS public.payment_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.custom_users(id) ON DELETE SET NULL,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    base_amount DECIMAL(10,2),
    gst_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'created',
    order_type TEXT NOT NULL,
    order_items JSONB,
    user_email TEXT,
    user_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_tracking_razorpay_order_id ON public.payment_tracking(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_user_id ON public.payment_tracking(user_id);
