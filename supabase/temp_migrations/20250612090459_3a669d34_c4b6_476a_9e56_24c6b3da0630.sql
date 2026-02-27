
-- Update the handle_new_user function to properly handle phone verification status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  existing_profile_id UUID;
BEGIN
  -- Only process if phone is provided in metadata
  IF new.raw_user_meta_data->>'phone' IS NOT NULL THEN
    -- Check if a profile with this phone already exists
    SELECT id INTO existing_profile_id 
    FROM public.profiles 
    WHERE phone = new.raw_user_meta_data->>'phone'
    LIMIT 1;
    
    IF existing_profile_id IS NOT NULL THEN
      -- Phone already exists, update the existing profile with new user details
      UPDATE public.profiles 
      SET 
        id = new.id,
        email = COALESCE(new.email, email),
        first_name = COALESCE(new.raw_user_meta_data->>'first_name', first_name),
        last_name = COALESCE(new.raw_user_meta_data->>'last_name', last_name),
        phone_verified = COALESCE((new.raw_user_meta_data->>'phone_verified')::boolean, false),
        updated_at = now()
      WHERE id = existing_profile_id;
    ELSE
      -- Phone doesn't exist, create new profile with phone_verified = false for new signups
      INSERT INTO public.profiles (id, email, first_name, last_name, phone, phone_verified)
      VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'last_name',
        new.raw_user_meta_data->>'phone',
        COALESCE((new.raw_user_meta_data->>'phone_verified')::boolean, false)
      );
    END IF;
  ELSIF new.email IS NOT NULL THEN
    -- Handle email-only users (no phone provided)
    INSERT INTO public.profiles (id, email, phone_verified, first_name, last_name)
    VALUES (
      new.id,
      new.email,
      false,
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name'
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = now();
  END IF;
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup process
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$;
