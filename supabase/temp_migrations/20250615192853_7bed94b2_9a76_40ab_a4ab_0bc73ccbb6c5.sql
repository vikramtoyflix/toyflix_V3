
-- Step 1: Create subscription_plan enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
        CREATE TYPE public.subscription_plan AS ENUM ('basic', 'premium', 'family');
    END IF;
END$$;

-- Step 2: Add columns from profiles to custom_users
ALTER TABLE public.custom_users
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS address_line2 TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC,
ADD COLUMN IF NOT EXISTS subscription_plan public.subscription_plan,
ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- Step 3: Migrate data from profiles to custom_users
-- This will copy existing profile data to the corresponding user record.
UPDATE public.custom_users cu
SET
    address_line1 = p.address_line1,
    address_line2 = p.address_line2,
    city = p.city,
    state = p.state,
    zip_code = p.zip_code,
    avatar_url = p.avatar_url,
    latitude = p.latitude,
    longitude = p.longitude,
    subscription_plan = p.subscription_plan,
    subscription_active = p.subscription_active,
    subscription_end_date = p.subscription_end_date,
    -- also copy over other details if they exist in profiles
    first_name = COALESCE(p.first_name, cu.first_name),
    last_name = COALESCE(p.last_name, cu.last_name),
    email = COALESCE(p.email, cu.email)
FROM public.profiles p
WHERE cu.phone = p.phone;

-- Step 4: Drop the old profiles table
DROP TABLE IF EXISTS public.profiles;

-- Step 5: Clean up old, unused database trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
