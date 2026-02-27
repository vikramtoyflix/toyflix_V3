-- COMPLETE DATABASE SETUP FROM SCRATCH
-- This will build your entire Toyflix database with all data and functionality
-- Run this in Supabase SQL Editor to set up everything

-- ========================================
-- STEP 1: Create all ENUM types
-- ========================================

CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.subscription_type AS ENUM ('monthly', 'yearly');  
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');

-- ========================================
-- STEP 2: Create core authentication tables
-- ========================================

-- Users table (core of the system)
CREATE TABLE public.custom_users (
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

-- User sessions for authentication
CREATE TABLE public.user_sessions (
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

-- JWT secrets for token signing
CREATE TABLE public.jwt_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id TEXT UNIQUE NOT NULL,
  secret_key TEXT NOT NULL,
  algorithm TEXT DEFAULT 'HS256',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- OTP verification system
CREATE TABLE public.otp_verifications (
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
-- STEP 3: Create product catalog (toys)
-- ========================================

CREATE TABLE public.toys (
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

-- ========================================
-- STEP 4: Create subscription system
-- ========================================

CREATE TABLE public.subscriptions (
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

CREATE TABLE public.user_entitlements (
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
-- STEP 5: Create order system  
-- ========================================

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.custom_users(id) ON DELETE CASCADE,
    status public.order_status NOT NULL DEFAULT 'pending',
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    base_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    gst_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    coupon_code TEXT,
    shipping_address JSONB,
    delivery_instructions TEXT,
    order_type TEXT DEFAULT 'subscription',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    toy_id UUID REFERENCES public.toys(id),
    subscription_category TEXT,
    age_group TEXT,
    ride_on_toy_id UUID REFERENCES public.toys(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2),
    total_price NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================================
-- STEP 6: Create admin system
-- ========================================

CREATE TABLE public.admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.admin_users_view (
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

-- ========================================
-- STEP 7: Create essential functions
-- ========================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Get user role function
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

-- Check if user is admin function
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

-- Get user profile function
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

-- Sync admin users view function
CREATE OR REPLACE FUNCTION public.sync_admin_users_view()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_users_view (
      id, email, phone, first_name, last_name, role, created_at,
      is_active, last_login, city, state, address_line1, updated_at
    )
    VALUES (
      NEW.id, NEW.email, NEW.phone, NEW.first_name, NEW.last_name, NEW.role, NEW.created_at,
      NEW.is_active, NEW.last_login, NEW.city, NEW.state, NEW.address_line1, NEW.updated_at
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.admin_users_view SET
      email = NEW.email,
      phone = NEW.phone,
      first_name = NEW.first_name,
      last_name = NEW.last_name,
      role = NEW.role,
      is_active = NEW.is_active,
      last_login = NEW.last_login,
      city = NEW.city,
      state = NEW.state,
      address_line1 = NEW.address_line1,
      updated_at = NEW.updated_at
    WHERE id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.admin_users_view WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ========================================
-- STEP 8: Create indexes for performance
-- ========================================

-- User indexes
CREATE INDEX idx_custom_users_phone ON public.custom_users(phone);
CREATE INDEX idx_custom_users_email ON public.custom_users(email);
CREATE INDEX idx_custom_users_role ON public.custom_users(role);

-- Session indexes
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);

-- Toy indexes
CREATE INDEX idx_toys_category ON public.toys(category);
CREATE INDEX idx_toys_age_range ON public.toys(age_range);
CREATE INDEX idx_toys_min_max_age ON public.toys(min_age, max_age);
CREATE INDEX idx_toys_available_quantity ON public.toys(available_quantity);
CREATE INDEX idx_toys_is_featured ON public.toys(is_featured);
CREATE UNIQUE INDEX toys_sku_unique ON public.toys(sku) WHERE sku IS NOT NULL;

-- Subscription indexes
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_user_entitlements_user_id ON public.user_entitlements(user_id);

-- Order indexes  
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_toy_id ON public.order_items(toy_id);

-- OTP indexes
CREATE INDEX idx_otp_verifications_phone ON public.otp_verifications(phone);
CREATE INDEX idx_otp_verifications_expires_at ON public.otp_verifications(expires_at);

-- Admin indexes
CREATE INDEX idx_admin_users_view_role ON public.admin_users_view(role);
CREATE INDEX idx_admin_users_view_phone ON public.admin_users_view(phone);

-- ========================================
-- STEP 9: Enable Row Level Security
-- ========================================

ALTER TABLE public.custom_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jwt_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users_view ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 10: Create RLS policies
-- ========================================

-- Custom users policies
CREATE POLICY "Public read access for phone lookup" ON public.custom_users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.custom_users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Service role full access" ON public.custom_users
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- User sessions policies
CREATE POLICY "Service role manages sessions" ON public.user_sessions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- JWT secrets policies  
CREATE POLICY "Service role manages JWT secrets" ON public.jwt_secrets
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- OTP policies
CREATE POLICY "Service role manages OTP" ON public.otp_verifications
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Toys policies (public read access)
CREATE POLICY "Public read access for toys" ON public.toys
  FOR SELECT USING (true);

CREATE POLICY "Service role manages toys" ON public.toys
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Subscription policies
CREATE POLICY "Users view own subscriptions" ON public.subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role manages subscriptions" ON public.subscriptions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- User entitlements policies
CREATE POLICY "Users view own entitlements" ON public.user_entitlements
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role manages entitlements" ON public.user_entitlements
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Order policies
CREATE POLICY "Users view own orders" ON public.orders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role manages orders" ON public.orders
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users view own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages order items" ON public.order_items
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Admin policies
CREATE POLICY "Service role manages admin settings" ON public.admin_settings
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Admins read admin settings" ON public.admin_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.custom_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Service role manages admin users view" ON public.admin_users_view
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Admins read admin users view" ON public.admin_users_view
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.custom_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- STEP 11: Create triggers
-- ========================================

-- Update timestamp triggers
CREATE TRIGGER update_custom_users_updated_at 
  BEFORE UPDATE ON public.custom_users 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_entitlements_updated_at
  BEFORE UPDATE ON public.user_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin sync triggers
CREATE TRIGGER sync_admin_users_insert
  AFTER INSERT ON public.custom_users
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_users_view();

CREATE TRIGGER sync_admin_users_update
  AFTER UPDATE ON public.custom_users
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_users_view();

CREATE TRIGGER sync_admin_users_delete
  AFTER DELETE ON public.custom_users
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_users_view();

-- ========================================
-- STEP 12: Insert initial data
-- ========================================

-- Insert JWT secret
INSERT INTO public.jwt_secrets (key_id, secret_key, algorithm, is_active) 
VALUES ('primary', encode(gen_random_bytes(32), 'base64'), 'HS256', true);

-- Insert toy data
INSERT INTO public.toys (
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
     'big', 2, 4, true, 1, false, 'big_toys', '2TF01'),

    ('5c67be16-b0a0-49dc-a2ad-4b8d647dccf3', '123 Tracing board',
     '123 Tracing board: Educational toy for developing skills.',
     'stem_toys', '3-4 years, 4-6 years', NULL, 799.00, 199.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217171175-123_Tracing_board.jpg',
     10, 10, 4.00, '2025-06-18 03:26:11.506905+00', '2025-06-18 03:26:11.506905+00',
     'standard', 3, 6, true, 2, false, 'stem_toys', '3TF035'),

    ('fc3cf7de-bddd-496a-8b53-f04d9b2ac0ef', '199 Moral Stories Book',
     'Here is a book with 199 exciting, fun stories for little ones.',
     'books', '1-2 years, 2-3 years', NULL, 300.00, 75.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217194754-199_Moral_Stories_Book.jpg',
     4, 4, 4.00, '2025-06-18 03:26:35.026586+00', '2025-06-18 03:26:35.026586+00',
     'standard', 1, 3, true, 3, false, 'books', NULL),

    ('38567087-4bc6-43e1-8f99-a77b85f26d0d', '2 in 1 Musical Learning Table',
     'Interactive learning table for toddlers.',
     'developmental_toys', '1-2 years, 2-3 years', NULL, 3699.00, 924.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217218842-2_in_1_Musical_Learning_Table.png',
     0, 0, 4.00, '2025-06-18 03:26:59.243803+00', '2025-06-18 03:26:59.243803+00',
     'standard', 1, 3, true, 4, false, 'educational_toys', NULL),

    ('b65b064b-8c0c-4c76-a153-0764c0a56fa1', '2-in-1 Musical Jam Playmat',
     '2-in-1 Musical Fun – Combines a piano keyboard and drum sounds for an engaging musical experience.',
     'big_toys', '3-4 years', NULL, 3599.00, 899.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217233661-2_in_1_Musical_Jam_Playmat.png',
     0, 0, 4.00, '2025-06-18 03:27:13.919498+00', '2025-06-18 03:27:13.919498+00',
     'big', 3, 4, true, 5, false, 'big_toys', NULL),

    ('feca3f78-30ad-4ba0-9306-854ce8f07c90', 'Air Hockey',
     'Air Hockey: This toy is designed to engage and develop essential skills in kids.',
     'big_toys', '4-6 years, 6-8 years', NULL, 6100.00, 1525.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217187947-Air_Hockey.jpg',
     2, 2, 4.00, '2025-06-18 03:26:28.182727+00', '2025-06-18 03:26:28.182727+00',
     'big', 4, 8, true, 6, true, 'big_toys', NULL),

    ('93f893c8-ede0-4f8b-a80d-1e06966d1f0e', 'Baybee Actro Tricycle with Parental Push Handle',
     'Baybee Actro Tricycle with Parental Push Handle: This toy is designed to engage and develop essential skills in kids.',
     'big_toys', '1-2 years, 2-3 years', NULL, 4000.00, 1000.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217182954-Baybee_Actro_Tricycle_with_Parental_Push_Handle.jpg',
     3, 3, 4.00, '2025-06-18 03:26:23.20329+00', '2025-06-18 03:26:23.20329+00',
     'big', 1, 3, true, 7, true, 'big_toys', NULL),

    ('ac309f46-0cd4-458b-bc1d-ef8c2b54d886', 'Baybee ATV Monstro - Black/Blue/Yellow',
     'Baybee ATV Monstro: All-terrain vehicle for kids.',
     'ride_on_toys', 'Ride on no age', NULL, 1999.00, 499.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217214747-Baybee_ATV_Monstro___Black_Blue_Yellow.jpg',
     1, 1, 4.00, '2025-06-18 03:26:55.082161+00', '2025-06-18 03:26:55.082161+00',
     'standard', 1, 8, true, 8, false, 'ride_on_toys', NULL),

    ('d485cbbb-639f-4921-af98-c2a51fe54bc7', 'Alphabet Train',
     'Alphabet Train: Educational toy for letter recognition.',
     'stem_toys', '1-2 years, 2-3 years', NULL, 1650.00, 412.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217142003-Alphabet_Train.jpg',
     13, 13, 4.00, '2025-06-18 03:25:42.216616+00', '2025-06-18 03:25:42.216616+00',
     'standard', 1, 3, true, 9, false, 'stem_toys', '1TF022'),

    ('708008a4-b6c8-42de-8434-1b87bda2f9d6', 'Baby Touch ABC - Touch and Feel Book',
     'Introduce your baby to their first letters with this large touch-and-feel playbook.',
     'books', '1-2 years', NULL, 400.00, 100.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217210943-Baby_Touch_ABC___Touch_and_Feel_Book.jpg',
     0, 0, 4.00, '2025-06-18 03:26:51.172471+00', '2025-06-18 03:26:51.172471+00',
     'standard', 1, 2, true, 10, false, 'books', NULL),

    ('ed00895c-83ea-46a8-9ae2-8f07bee6e402', 'Baybee Cruiser Pedal Go Kart Racing Ride on',
     'Always ready to go, never need to worry about batteries that require charging.',
     'big_toys', '2-3 years, 3-4 years, 4-6 years', NULL, 2999.00, 749.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217183318-Baybee_Cruiser_Pedal_Go_Kart_Racing_Ride_on.jpg',
     4, 4, 4.00, '2025-06-18 03:26:23.668507+00', '2025-06-18 03:26:23.668507+00',
     'big', 2, 6, true, 11, true, 'big_toys', NULL),

    ('c81c6364-3e41-49eb-b429-6aa0caee3d41', 'Baybee Magic Swing Cars for Kids',
     'Baybee Magic Swing Cars for Kids: This toy is designed to engage and develop essential skills in kids.',
     'big_toys', '3-4 years, 4-6 years, 6-8 years', NULL, 4000.00, 1000.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217184657-Baybee_Magic_Swing_Cars_for_Kids.jpg',
     1, 1, 4.00, '2025-06-18 03:26:24.941485+00', '2025-06-18 03:26:24.941485+00',
     'big', 3, 8, true, 12, true, 'big_toys', NULL);

-- Create admin user
INSERT INTO public.custom_users (phone, email, first_name, last_name, role, phone_verified, is_active)
VALUES ('8595968253', 'admin@toyflix.com', 'Admin', 'User', 'admin', true, true);

-- ========================================
-- SETUP COMPLETE!
-- ========================================

SELECT 
  'DATABASE SETUP COMPLETE!' as status,
  (SELECT COUNT(*) FROM public.toys) as toys_created,
  (SELECT COUNT(*) FROM public.custom_users) as admin_users_created,
  'Your Toyflix database is ready for production!' as message; 