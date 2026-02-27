
-- Step 1: Enable Row Level Security on the custom_users table
ALTER TABLE public.custom_users ENABLE ROW LEVEL SECURITY;

-- Step 2: Policy for users to view their own data
-- This allows a user to select their own row from the custom_users table.
CREATE POLICY "Users can view their own data"
ON public.custom_users FOR SELECT
USING (auth.uid() = id);

-- Step 3: Policy for users to update their own data
-- This allows a user to update their own profile information.
CREATE POLICY "Users can update their own data"
ON public.custom_users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
