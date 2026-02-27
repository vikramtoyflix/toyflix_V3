
-- Update the handle_new_user function to work with native Supabase phone authentication
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Create profile for phone-authenticated users
  IF new.phone IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, phone, phone_verified, first_name, last_name)
    VALUES (
      new.id,
      new.email,
      new.phone,
      new.phone_confirmed_at IS NOT NULL, -- Use Supabase's native phone confirmation status
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name'
    )
    ON CONFLICT (id) DO UPDATE SET
      phone = EXCLUDED.phone,
      phone_verified = EXCLUDED.phone_verified,
      email = EXCLUDED.email,
      updated_at = now();
  -- Create profile for email-authenticated users (if any)
  ELSIF new.email IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, phone_verified, first_name, last_name)
    VALUES (
      new.id,
      new.email,
      false, -- Email users don't have phone verification by default
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name'
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = now();
  END IF;
  
  RETURN new;
END;
$$;
