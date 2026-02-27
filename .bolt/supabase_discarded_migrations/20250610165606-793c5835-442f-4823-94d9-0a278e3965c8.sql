
-- Create subscription-related tables
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  pause_balance INTEGER NOT NULL DEFAULT 0,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user entitlements table
CREATE TABLE public.user_entitlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id),
  current_month TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  standard_toys_remaining INTEGER NOT NULL DEFAULT 0,
  big_toys_remaining INTEGER NOT NULL DEFAULT 0,
  books_remaining INTEGER NOT NULL DEFAULT 0,
  premium_toys_remaining INTEGER DEFAULT 0,
  value_cap_remaining NUMERIC NOT NULL DEFAULT 0,
  early_access BOOLEAN NOT NULL DEFAULT false,
  reservation_enabled BOOLEAN NOT NULL DEFAULT false,
  roller_coaster_delivered BOOLEAN NOT NULL DEFAULT false,
  coupe_ride_delivered BOOLEAN NOT NULL DEFAULT false,
  next_billing_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create billing records table
CREATE TABLE public.billing_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id),
  amount NUMERIC NOT NULL,
  gst NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  billing_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pause records table
CREATE TABLE public.pause_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id),
  pause_start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pause_end_date TIMESTAMP WITH TIME ZONE,
  months_paused INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create perk assignments table
CREATE TABLE public.perk_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id),
  perk_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivered_date TIMESTAMP WITH TIME ZONE,
  toy_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pause_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perk_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" 
  ON public.subscriptions FOR SELECT 
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own subscriptions" 
  ON public.subscriptions FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own subscriptions" 
  ON public.subscriptions FOR UPDATE 
  USING (auth.uid()::text = user_id::text);

-- Create policies for user_entitlements
CREATE POLICY "Users can view their own entitlements" 
  ON public.user_entitlements FOR SELECT 
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own entitlements" 
  ON public.user_entitlements FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own entitlements" 
  ON public.user_entitlements FOR UPDATE 
  USING (auth.uid()::text = user_id::text);

-- Create policies for billing_records
CREATE POLICY "Users can view their own billing records" 
  ON public.billing_records FOR SELECT 
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own billing records" 
  ON public.billing_records FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);

-- Create policies for pause_records
CREATE POLICY "Users can view their own pause records" 
  ON public.pause_records FOR SELECT 
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own pause records" 
  ON public.pause_records FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);

-- Create policies for perk_assignments
CREATE POLICY "Users can view their own perk assignments" 
  ON public.perk_assignments FOR SELECT 
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own perk assignments" 
  ON public.perk_assignments FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own perk assignments" 
  ON public.perk_assignments FOR UPDATE 
  USING (auth.uid()::text = user_id::text);
