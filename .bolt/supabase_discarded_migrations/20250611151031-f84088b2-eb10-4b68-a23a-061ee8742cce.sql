
-- First, let's handle existing profiles that might have null phone values
-- We'll set a temporary phone value for existing users without phones
UPDATE public.profiles 
SET phone = '+91' || id::text 
WHERE phone IS NULL;

-- Now we can safely add the unique constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_phone_unique UNIQUE (phone);

-- Make phone not nullable since it's now the primary identifier
ALTER TABLE public.profiles 
ALTER COLUMN phone SET NOT NULL;

-- Add index for faster phone number lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone);

-- Update the handle_new_user function to work with phone-based auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only create profile if phone is provided in metadata
  IF new.raw_user_meta_data->>'phone' IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, first_name, last_name, phone, phone_verified)
    VALUES (
      new.id,
      new.email,
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name',
      new.raw_user_meta_data->>'phone',
      true  -- Mark as verified since they went through OTP
    );
  END IF;
  RETURN new;
END;
$$;
