-- RESTORE CORE DATABASE STRUCTURE
-- This migration restores the fundamental tables and functions that the app depends on

-- Step 1: Create ENUM type for user roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'user');
    END IF;
END$$;

-- Step 2: Create custom_users table if it doesn't exist
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

-- Step 3: Create user_sessions table if it doesn't exist
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

-- Step 4: Create JWT secrets table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.jwt_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id TEXT UNIQUE NOT NULL,
  secret_key TEXT NOT NULL,
  algorithm TEXT DEFAULT 'HS256',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Step 5: Create admin_settings table
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Create admin_users_view table
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

-- Step 7: Create update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 8: Create get_user_role_secure function
CREATE OR REPLACE FUNCTION public.get_user_role_secure(user_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role_result text;
BEGIN
  -- Get user role from custom_users table
  SELECT role::text INTO user_role_result
  FROM public.custom_users
  WHERE id = user_id_param;
  
  RETURN COALESCE(user_role_result, 'user');
END;
$$;

-- Step 9: Create is_user_admin function
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if user is admin based on role in custom_users
  RETURN EXISTS (
    SELECT 1 FROM public.custom_users 
    WHERE id = user_id_param 
    AND role = 'admin'
  );
END;
$$;

-- Step 10: Create get_user_profile function
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
    -- Find the user_id associated with the provided active session token
    SELECT user_id INTO v_user_id
    FROM public.user_sessions
    WHERE session_token = p_session_token
      AND expires_at > now()
      AND is_active = true;

    -- If no valid session is found, return null
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Retrieve and return the user's profile  
    SELECT * INTO v_profile
    FROM public.custom_users
    WHERE id = v_user_id;

    RETURN v_profile;
END;
$$;

-- Step 11: Create sync function for admin_users_view
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

-- Step 12: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON public.user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_custom_users_phone ON public.custom_users(phone);
CREATE INDEX IF NOT EXISTS idx_custom_users_email ON public.custom_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_view_role ON public.admin_users_view(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_view_created_at ON public.admin_users_view(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_users_view_is_active ON public.admin_users_view(is_active);

-- Step 13: Enable RLS on all tables
ALTER TABLE public.custom_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jwt_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users_view ENABLE ROW LEVEL SECURITY;

-- Step 14: Create RLS policies for custom_users
-- Allow users to view and update their own data
CREATE POLICY "Users can view their own data" ON public.custom_users
  FOR SELECT USING (true); -- Allow public access for phone number lookups

CREATE POLICY "Users can update their own data" ON public.custom_users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Service role can manage users" ON public.custom_users
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Step 15: Create RLS policies for user_sessions
CREATE POLICY "Service role can manage sessions" ON public.user_sessions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Step 16: Create RLS policies for jwt_secrets
CREATE POLICY "Service role can manage JWT secrets" ON public.jwt_secrets
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Step 17: Create RLS policies for admin_settings
CREATE POLICY "Allow service role to manage admin_settings" ON public.admin_settings
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Allow custom_users with admin role to access admin_settings
CREATE POLICY "Allow admins to manage admin_settings" ON public.admin_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.custom_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Step 18: Create RLS policies for admin_users_view
CREATE POLICY "Allow service role to manage admin_users_view" ON public.admin_users_view
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Allow admins to view admin_users_view" ON public.admin_users_view
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.custom_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Step 19: Create triggers
CREATE TRIGGER update_custom_users_updated_at 
  BEFORE UPDATE ON public.custom_users 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create sync triggers only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_admin_users_insert') THEN
    CREATE TRIGGER sync_admin_users_insert
      AFTER INSERT ON public.custom_users
      FOR EACH ROW EXECUTE FUNCTION public.sync_admin_users_view();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_admin_users_update') THEN
    CREATE TRIGGER sync_admin_users_update
      AFTER UPDATE ON public.custom_users
      FOR EACH ROW EXECUTE FUNCTION public.sync_admin_users_view();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_admin_users_delete') THEN
    CREATE TRIGGER sync_admin_users_delete
      AFTER DELETE ON public.custom_users
      FOR EACH ROW EXECUTE FUNCTION public.sync_admin_users_view();
  END IF;
END$$;

-- Step 20: Insert initial JWT secret if none exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.jwt_secrets WHERE key_id = 'primary') THEN
    INSERT INTO public.jwt_secrets (key_id, secret_key, algorithm, is_active) 
    VALUES ('primary', encode(gen_random_bytes(32), 'base64'), 'HS256', true);
  END IF;
END$$;

-- Step 21: Populate admin_users_view from custom_users if it's empty
INSERT INTO public.admin_users_view (
  id, email, phone, first_name, last_name, role, created_at, 
  is_active, last_login, city, state, address_line1, updated_at
)
SELECT 
  id, email, phone, first_name, last_name, role, created_at,
  is_active, last_login, city, state, address_line1, updated_at
FROM public.custom_users
WHERE NOT EXISTS (SELECT 1 FROM public.admin_users_view WHERE admin_users_view.id = custom_users.id);

-- Step 22: Create toys table if it doesn't exist
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

-- Enable RLS on toys table
ALTER TABLE public.toys ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for public read access
CREATE POLICY "Public read access for toys" ON public.toys FOR SELECT USING (true);

CREATE POLICY "Service role can manage toys" ON public.toys
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Create indexes for toys table
CREATE INDEX IF NOT EXISTS idx_toys_category ON public.toys(category);
CREATE INDEX IF NOT EXISTS idx_toys_age_range ON public.toys(age_range);  
CREATE INDEX IF NOT EXISTS idx_toys_min_max_age ON public.toys(min_age, max_age);
CREATE INDEX IF NOT EXISTS idx_toys_available ON public.toys(available_quantity);
CREATE UNIQUE INDEX IF NOT EXISTS toys_sku_unique ON public.toys(sku) WHERE sku IS NOT NULL;

-- Step 23: Update any admin users (in case they exist)
UPDATE public.custom_users
SET role = 'admin'
WHERE email IN ('admin@toyflix.com', 'evinjy@gmail.com') OR phone IN ('8595968253', '+918595968253'); 