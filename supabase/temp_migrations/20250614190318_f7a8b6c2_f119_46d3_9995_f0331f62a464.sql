
-- Create a new ENUM type for user roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'user');
    END IF;
END$$;

-- Add a 'role' column to the custom_users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'custom_users' AND column_name = 'role') THEN
        ALTER TABLE public.custom_users ADD COLUMN role public.app_role NOT NULL DEFAULT 'user';
    END IF;
END$$;

-- Update the role for existing admin users based on their email
UPDATE public.custom_users
SET role = 'admin'
WHERE email IN ('admin@toyflix.com', 'evinjy@gmail.com');

-- Drop the old function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS public.get_user_role_secure(user_id_param uuid);

-- Create a new version of the function to read role from custom_users table
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
