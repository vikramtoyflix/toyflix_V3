
-- This command removes a duplicate Row Level Security policy on the custom_users table.
-- This is likely the root cause of the "multiple (or no) rows returned" error when updating user profiles.
DROP POLICY IF EXISTS "Users can view their own profile" ON public.custom_users;
