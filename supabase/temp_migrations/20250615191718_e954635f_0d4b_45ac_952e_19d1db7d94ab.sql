
-- Enable Row Level Security on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile.
CREATE POLICY "Users can view their own profiles"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Policy: Users can update their own profile.
CREATE POLICY "Users can update their own profiles"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: Users can insert their own profile.
-- This might be needed if profiles are not created automatically during sign-up.
CREATE POLICY "Users can insert their own profiles"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);
