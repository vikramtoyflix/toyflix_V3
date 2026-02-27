
-- Drop all potentially conflicting RLS policies on custom_users
-- This ensures a clean slate before adding the new function-based security.
DROP POLICY IF EXISTS "Users can view their own profile" ON public.custom_users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.custom_users;
DROP POLICY IF EXISTS "Users can view their own data" ON public.custom_users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.custom_users;

-- Creates a function to securely retrieve a user's profile using their session token.
-- This function will be called by the frontend to load profile data.
CREATE OR REPLACE FUNCTION get_user_profile(p_session_token TEXT)
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

-- Creates a function to securely update a user's profile.
-- It verifies the user's session token before applying any changes.
CREATE OR REPLACE FUNCTION update_user_profile(p_updates JSONB, p_session_token TEXT)
RETURNS public.custom_users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_updated_profile public.custom_users;
BEGIN
    -- Find the user_id associated with the provided active session token
    SELECT user_id INTO v_user_id
    FROM public.user_sessions
    WHERE session_token = p_session_token
      AND expires_at > now()
      AND is_active = true;

    -- If the session is invalid or expired, raise an error
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired session token';
    END IF;

    -- Update only the fields present in the p_updates JSON object
    UPDATE public.custom_users
    SET
        first_name      = CASE WHEN p_updates ? 'first_name' THEN p_updates->>'first_name' ELSE first_name END,
        last_name       = CASE WHEN p_updates ? 'last_name' THEN p_updates->>'last_name' ELSE last_name END,
        address_line1   = CASE WHEN p_updates ? 'address_line1' THEN p_updates->>'address_line1' ELSE address_line1 END,
        city            = CASE WHEN p_updates ? 'city' THEN p_updates->>'city' ELSE city END,
        state           = CASE WHEN p_updates ? 'state' THEN p_updates->>'state' ELSE state END,
        zip_code        = CASE WHEN p_updates ? 'zip_code' THEN p_updates->>'zip_code' ELSE zip_code END,
        latitude        = CASE WHEN p_updates ? 'latitude' THEN (p_updates->>'latitude')::numeric ELSE latitude END,
        longitude       = CASE WHEN p_updates ? 'longitude' THEN (p_updates->>'longitude')::numeric ELSE longitude END,
        updated_at      = now()
    WHERE id = v_user_id
    RETURNING * INTO v_updated_profile;

    RETURN v_updated_profile;
END;
$$;
