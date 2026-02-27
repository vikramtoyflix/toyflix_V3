
-- First, create a security definer function to check if a user is an admin
-- This prevents infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if user is admin based on email or admin role
  -- This uses the useUserRole logic from the frontend
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id_param 
    AND email IN ('admin@toyflix.com', 'evinjy@gmail.com')
  );
END;
$$;

-- Create comprehensive RLS policies for the toys table
-- First drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.toys;
DROP POLICY IF EXISTS "Admins can insert toys" ON public.toys;
DROP POLICY IF EXISTS "Admins can update toys" ON public.toys;
DROP POLICY IF EXISTS "Admins can delete toys" ON public.toys;

-- Create new comprehensive policies
-- Allow public read access (catalog browsing)
CREATE POLICY "Enable read access for all users" 
ON public.toys 
FOR SELECT 
USING (true);

-- Allow only admins to insert toys
CREATE POLICY "Admins can insert toys" 
ON public.toys 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_user_admin());

-- Allow only admins to update toys
CREATE POLICY "Admins can update toys" 
ON public.toys 
FOR UPDATE 
TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

-- Allow only admins to delete toys
CREATE POLICY "Admins can delete toys" 
ON public.toys 
FOR DELETE 
TO authenticated
USING (public.is_user_admin());

-- Also ensure RLS is enabled on the toys table
ALTER TABLE public.toys ENABLE ROW LEVEL SECURITY;

-- Update the useUserRole function to be more robust
-- Create a function that mirrors the frontend logic
CREATE OR REPLACE FUNCTION public.get_user_role_secure(user_id_param uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_email text;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email
  FROM auth.users 
  WHERE id = user_id_param;
  
  -- Check if user is admin based on email
  IF user_email IN ('admin@toyflix.com', 'evinjy@gmail.com') THEN
    RETURN 'admin';
  END IF;
  
  RETURN 'user';
END;
$$;
