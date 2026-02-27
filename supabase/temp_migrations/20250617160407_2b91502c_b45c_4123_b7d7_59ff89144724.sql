
-- Enable RLS on the toys table if not already enabled
ALTER TABLE public.toys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.toys;
DROP POLICY IF EXISTS "Admins can insert toys" ON public.toys;
DROP POLICY IF EXISTS "Admins can update toys" ON public.toys;
DROP POLICY IF EXISTS "Admins can delete toys" ON public.toys;
DROP POLICY IF EXISTS "Public can read toys" ON public.toys;
DROP POLICY IF EXISTS "Admins can manage all toys" ON public.toys;

-- Create comprehensive RLS policies for the toys table

-- Allow public read access for catalog browsing
CREATE POLICY "Public can read toys" 
ON public.toys 
FOR SELECT 
USING (true);

-- Allow admin users to insert toys
CREATE POLICY "Admins can insert toys" 
ON public.toys 
FOR INSERT 
TO authenticated
WITH CHECK (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE public.get_user_role_secure(auth.uid()) = 'admin'
  END
);

-- Allow admin users to update toys
CREATE POLICY "Admins can update toys" 
ON public.toys 
FOR UPDATE 
TO authenticated
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE public.get_user_role_secure(auth.uid()) = 'admin'
  END
)
WITH CHECK (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE public.get_user_role_secure(auth.uid()) = 'admin'
  END
);

-- Allow admin users to delete toys
CREATE POLICY "Admins can delete toys" 
ON public.toys 
FOR DELETE 
TO authenticated
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE public.get_user_role_secure(auth.uid()) = 'admin'
  END
);

-- Also ensure toy_images table has proper RLS policies
ALTER TABLE public.toy_images ENABLE ROW LEVEL SECURITY;

-- Drop existing toy_images policies if they exist
DROP POLICY IF EXISTS "Public can read toy images" ON public.toy_images;
DROP POLICY IF EXISTS "Admins can manage toy images" ON public.toy_images;

-- Allow public read access to toy images
CREATE POLICY "Public can read toy images" 
ON public.toy_images 
FOR SELECT 
USING (true);

-- Allow admin users to manage toy images
CREATE POLICY "Admins can manage toy images" 
ON public.toy_images 
FOR ALL 
TO authenticated
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE public.get_user_role_secure(auth.uid()) = 'admin'
  END
)
WITH CHECK (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE public.get_user_role_secure(auth.uid()) = 'admin'
  END
);
