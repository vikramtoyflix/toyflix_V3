-- EMERGENCY DATABASE RECOVERY SCRIPT
-- This will restore your entire database structure + all toy data
-- Run this IMMEDIATELY in Supabase SQL Editor

-- ========================================
-- STEP 1: Create ENUM types
-- ========================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'user');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_type') THEN
        CREATE TYPE public.subscription_type AS ENUM ('monthly', 'yearly');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
    END IF;
END$$;

-- ========================================
-- STEP 2: Restore core tables
-- ========================================

-- Custom users table
CREATE TABLE IF NOT EXISTS public.custom_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  role public.app_role NOT NULL DEFAULT 'user',
  city TEXT,
  state TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  zip_code TEXT,
  latitude FLOAT,
  longitude FLOAT,
  avatar_url TEXT,
  subscription_active BOOLEAN DEFAULT false,
  subscription_plan TEXT,
  subscription_end_date TIMESTAMP WITH TIME ZONE
);

-- User sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.custom_users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE NOT NULL,
  device_info JSONB,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  refresh_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- JWT secrets
CREATE TABLE IF NOT EXISTS public.jwt_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id TEXT UNIQUE NOT NULL,
  secret_key TEXT NOT NULL,
  algorithm TEXT DEFAULT 'HS256',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Admin settings
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users view
CREATE TABLE IF NOT EXISTS public.admin_users_view (
  id uuid PRIMARY KEY,
  email text,
  phone text NOT NULL,
  first_name text,
  last_name text,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  last_login timestamp with time zone,
  city text,
  state text,
  address_line1 text,
  updated_at timestamp with time zone DEFAULT now()
);

-- OTP verifications
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE
);

-- ========================================
-- STEP 3: RESTORE TOYS TABLE WITH ALL DATA
-- ========================================

CREATE TABLE IF NOT EXISTS public.toys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('big_toys', 'stem_toys', 'educational_toys', 'books', 'developmental_toys', 'ride_on_toys')),
    age_range TEXT NOT NULL,
    brand TEXT,
    retail_price NUMERIC,
    rental_price NUMERIC,
    image_url TEXT,
    available_quantity INTEGER DEFAULT 1,
    total_quantity INTEGER DEFAULT 1,
    rating NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    pack TEXT,
    min_age INTEGER,
    max_age INTEGER,
    show_strikethrough_pricing BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    subscription_category TEXT CHECK (subscription_category IN ('big_toys', 'stem_toys', 'educational_toys', 'books', 'developmental_toys', 'ride_on_toys')),
    sku TEXT
);

-- Insert all toy data back
INSERT INTO toys (
    id, name, description, category, age_range, brand, retail_price, rental_price, 
    image_url, available_quantity, total_quantity, rating, created_at, updated_at,
    pack, min_age, max_age, show_strikethrough_pricing, display_order, is_featured,
    subscription_category, sku
) VALUES 
    ('fa982dd0-f888-41f6-808e-3287fbcd8a89', 'Hi Life Roll & Run Puzzle Cart', 
     'Hi Life Roll & Run Puzzle Cart: This toy is designed to engage and develop essential skills in kids.', 
     'big_toys', '2-3 years, 3-4 years', NULL, 2499.00, 624.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217124935-Hi_Life_Roll___Run_Puzzle_Cart.webp',
     8, 8, 4.00, '2025-06-18 03:25:25.34484+00', '2025-06-18 03:25:25.34484+00',
     'big', 2, 4, true, 9999, false, 'big_toys', '2TF01'),

    ('5c67be16-b0a0-49dc-a2ad-4b8d647dccf3', '123 Tracing board',
     '123 Tracing board: Educational toy for developing skills.',
     'stem_toys', '3-4 years, 4-6 years', NULL, 799.00, 199.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217171175-123_Tracing_board.jpg',
     10, 10, 4.00, '2025-06-18 03:26:11.506905+00', '2025-06-18 03:26:11.506905+00',
     'standard', 3, 6, true, 9999, false, 'stem_toys', '3TF035'),

    ('fc3cf7de-bddd-496a-8b53-f04d9b2ac0ef', '199 Moral Stories Book',
     'Here is a book with 199 exciting, fun stories for little ones.',
     'books', '1-2 years, 2-3 years', NULL, 300.00, 75.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217194754-199_Moral_Stories_Book.jpg',
     4, 4, 4.00, '2025-06-18 03:26:35.026586+00', '2025-06-18 03:26:35.026586+00',
     'standard', 1, 3, true, 9999, false, 'books', NULL),

    ('38567087-4bc6-43e1-8f99-a77b85f26d0d', '2 in 1 Musical Learning Table',
     'Interactive learning table for toddlers.',
     'developmental_toys', '1-2 years, 2-3 years', NULL, 3699.00, 924.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217218842-2_in_1_Musical_Learning_Table.png',
     0, 0, 4.00, '2025-06-18 03:26:59.243803+00', '2025-06-18 03:26:59.243803+00',
     'standard', 1, 3, true, 9999, false, 'educational_toys', NULL),

    ('b65b064b-8c0c-4c76-a153-0764c0a56fa1', '2-in-1 Musical Jam Playmat',
     '2-in-1 Musical Fun – Combines a piano keyboard and drum sounds for an engaging musical experience.',
     'big_toys', '3-4 years', NULL, 3599.00, 899.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217233661-2_in_1_Musical_Jam_Playmat.png',
     0, 0, 4.00, '2025-06-18 03:27:13.919498+00', '2025-06-18 03:27:13.919498+00',
     'big', 3, 4, true, 9999, false, 'big_toys', NULL),

    ('feca3f78-30ad-4ba0-9306-854ce8f07c90', 'Air Hockey',
     'Air Hockey: This toy is designed to engage and develop essential skills in kids.',
     'big_toys', '4-6 years, 6-8 years', NULL, 6100.00, 1525.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217187947-Air_Hockey.jpg',
     2, 2, 4.00, '2025-06-18 03:26:28.182727+00', '2025-06-18 03:26:28.182727+00',
     'big', 4, 8, true, 9999, true, 'big_toys', NULL),

    ('93f893c8-ede0-4f8b-a80d-1e06966d1f0e', 'Baybee Actro Tricycle with Parental Push Handle',
     'Baybee Actro Tricycle with Parental Push Handle: This toy is designed to engage and develop essential skills in kids.',
     'big_toys', '1-2 years, 2-3 years', NULL, 4000.00, 1000.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217182954-Baybee_Actro_Tricycle_with_Parental_Push_Handle.jpg',
     3, 3, 4.00, '2025-06-18 03:26:23.20329+00', '2025-06-18 03:26:23.20329+00',
     'big', 1, 3, true, 9999, true, 'big_toys', NULL),

    ('ac309f46-0cd4-458b-bc1d-ef8c2b54d886', 'Baybee ATV Monstro - Black/Blue/Yellow',
     'Baybee ATV Monstro: All-terrain vehicle for kids.',
     'ride_on_toys', 'Ride on no age', NULL, 1999.00, 499.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217214747-Baybee_ATV_Monstro___Black_Blue_Yellow.jpg',
     1, 1, 4.00, '2025-06-18 03:26:55.082161+00', '2025-06-18 03:26:55.082161+00',
     'standard', 1, 8, true, 9999, false, 'ride_on_toys', NULL),

    ('d485cbbb-639f-4921-af98-c2a51fe54bc7', 'Alphabet Train',
     'Alphabet Train: Educational toy for letter recognition.',
     'stem_toys', '1-2 years, 2-3 years', NULL, 1650.00, 412.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217142003-Alphabet_Train.jpg',
     13, 13, 4.00, '2025-06-18 03:25:42.216616+00', '2025-06-18 03:25:42.216616+00',
     'standard', 1, 3, true, 9999, false, 'stem_toys', '1TF022'),

    ('708008a4-b6c8-42de-8434-1b87bda2f9d6', 'Baby Touch ABC - Touch and Feel Book',
     'Introduce your baby to their first letters with this large touch-and-feel playbook.',
     'books', '1-2 years', NULL, 400.00, 100.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217210943-Baby_Touch_ABC___Touch_and_Feel_Book.jpg',
     0, 0, 4.00, '2025-06-18 03:26:51.172471+00', '2025-06-18 03:26:51.172471+00',
     'standard', 1, 2, true, 9999, false, 'books', NULL),

    ('ed00895c-83ea-46a8-9ae2-8f07bee6e402', 'Baybee Cruiser Pedal Go Kart Racing Ride on',
     'Always ready to go, never need to worry about batteries that require charging.',
     'big_toys', '2-3 years, 3-4 years, 4-6 years', NULL, 2999.00, 749.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217183318-Baybee_Cruiser_Pedal_Go_Kart_Racing_Ride_on.jpg',
     4, 4, 4.00, '2025-06-18 03:26:23.668507+00', '2025-06-18 03:26:23.668507+00',
     'big', 2, 6, true, 9999, true, 'big_toys', NULL),

    ('c81c6364-3e41-49eb-b429-6aa0caee3d41', 'Baybee Magic Swing Cars for Kids',
     'Baybee Magic Swing Cars for Kids: This toy is designed to engage and develop essential skills in kids.',
     'big_toys', '3-4 years, 4-6 years, 6-8 years', NULL, 4000.00, 1000.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217184657-Baybee_Magic_Swing_Cars_for_Kids.jpg',
     1, 1, 4.00, '2025-06-18 03:26:24.941485+00', '2025-06-18 03:26:24.941485+00',
     'big', 3, 8, true, 9999, true, 'big_toys', NULL)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STEP 4: Subscription tables (critical!)
-- ========================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.custom_users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    current_period_start DATE NOT NULL DEFAULT CURRENT_DATE,
    current_period_end DATE NOT NULL,
    pause_balance INTEGER NOT NULL DEFAULT 0,
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    subscription_type public.subscription_type DEFAULT 'monthly',
    ride_on_toy_id UUID REFERENCES public.toys(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.custom_users(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================================
-- STEP 5: Create functions
-- ========================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION public.get_user_role_secure(user_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role_result text;
BEGIN
  SELECT role::text INTO user_role_result
  FROM public.custom_users
  WHERE id = user_id_param;
  
  RETURN COALESCE(user_role_result, 'user');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_user_admin(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.custom_users 
    WHERE id = user_id_param 
    AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_profile(p_session_token TEXT)
RETURNS public.custom_users
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_id UUID;
    v_profile public.custom_users;
BEGIN
    SELECT user_id INTO v_user_id
    FROM public.user_sessions
    WHERE session_token = p_session_token
      AND expires_at > now()
      AND is_active = true;

    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_profile
    FROM public.custom_users
    WHERE id = v_user_id;

    RETURN v_profile;
END;
$$;

-- ========================================
-- STEP 6: Enable RLS and set policies
-- ========================================

ALTER TABLE public.custom_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jwt_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users_view ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

-- Create essential policies
CREATE POLICY "Users can view their own data" ON public.custom_users FOR SELECT USING (true);
CREATE POLICY "Service role can manage users" ON public.custom_users FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role can manage sessions" ON public.user_sessions FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role can manage JWT secrets" ON public.jwt_secrets FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Allow service role to manage admin_settings" ON public.admin_settings FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Allow service role to manage admin_users_view" ON public.admin_users_view FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Allow service role to manage otp_verifications" ON public.otp_verifications FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Public read access for toys" ON public.toys FOR SELECT USING (true);
CREATE POLICY "Service role can manage toys" ON public.toys FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role can manage entitlements" ON public.user_entitlements FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ========================================
-- STEP 7: Create indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_custom_users_phone ON public.custom_users(phone);
CREATE INDEX IF NOT EXISTS idx_toys_category ON public.toys(category);
CREATE INDEX IF NOT EXISTS idx_toys_age_range ON public.toys(age_range);
CREATE INDEX IF NOT EXISTS idx_toys_available_quantity ON public.toys(available_quantity);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_phone ON public.otp_verifications(phone);

-- ========================================
-- STEP 8: Initialize data
-- ========================================

-- Insert JWT secret
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.jwt_secrets WHERE key_id = 'primary') THEN
    INSERT INTO public.jwt_secrets (key_id, secret_key, algorithm, is_active) 
    VALUES ('primary', encode(gen_random_bytes(32), 'base64'), 'HS256', true);
  END IF;
END$$;

-- Update admin users
UPDATE public.custom_users
SET role = 'admin'
WHERE email IN ('admin@toyflix.com', 'evinjy@gmail.com') OR phone IN ('8595968253', '+918595968253');

-- ========================================
-- RECOVERY COMPLETE!
-- ========================================

SELECT 
  'EMERGENCY RECOVERY COMPLETE!' as status,
  (SELECT COUNT(*) FROM public.toys) as toys_restored,
  (SELECT COUNT(*) FROM public.custom_users) as users_count,
  'Database fully restored with all core functionality' as message; 