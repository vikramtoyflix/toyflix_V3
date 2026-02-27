
-- This command removes the duplicate "update" policy on the custom_users table.
-- Having multiple conflicting update policies was causing the error when saving profile changes.
DROP POLICY IF EXISTS "Users can update their own data" ON public.custom_users;
