
-- Step 1: Drop the old function and all its dependent policies using CASCADE.
DROP FUNCTION IF EXISTS public.is_user_admin(uuid) CASCADE;

-- Step 2: Re-create the function to correctly check for an admin role in the `custom_users` table.
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  user_role_result TEXT;
BEGIN
  -- We fetch the user's role from the custom_users table.
  SELECT role::text INTO user_role_result
  FROM public.custom_users
  WHERE id = user_id_param;
  
  -- The function returns true only if the role is 'admin'.
  RETURN user_role_result = 'admin';
END;
$$;

-- Step 3: Re-create the security policies that were dropped by the CASCADE operation.

-- Policies for the 'toys' table
CREATE POLICY "Admins can insert toys" 
ON public.toys 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can update toys" 
ON public.toys 
FOR UPDATE 
TO authenticated
USING (public.is_user_admin(auth.uid()))
WITH CHECK (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can delete toys" 
ON public.toys 
FOR DELETE 
TO authenticated
USING (public.is_user_admin(auth.uid()));

-- Policy for the 'carousel_slides' table. This allows admins to perform all actions.
CREATE POLICY "Admins can manage carousel slides"
ON public.carousel_slides
FOR ALL
TO authenticated
USING (public.is_user_admin(auth.uid()))
WITH CHECK (public.is_user_admin(auth.uid()));

-- Policies for 'storage.objects' for the 'toy-images' bucket
-- This recreates the policies mentioned in the error log.
CREATE POLICY "Admins can update toy images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'toy-images' AND public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can delete toy images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'toy-images' AND public.is_user_admin(auth.uid()));
