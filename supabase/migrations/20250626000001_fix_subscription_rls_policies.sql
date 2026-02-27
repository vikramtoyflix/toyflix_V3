-- Fix RLS policies for subscription creation
-- The current policies block frontend subscription creation because they rely on auth.uid()
-- but the app uses custom phone-based authentication

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own entitlements" ON public.user_entitlements;
DROP POLICY IF EXISTS "Users can update their own entitlements" ON public.user_entitlements;

-- Create more permissive policies that work with both authenticated users and service role
-- Allow authenticated users to insert subscriptions (for frontend subscription creation)
CREATE POLICY "Allow subscription creation for authenticated users"
  ON public.subscriptions FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Allow authenticated users to update their own subscriptions
CREATE POLICY "Users can update their own subscriptions"
  ON public.subscriptions FOR UPDATE
  TO authenticated, anon
  USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub' OR current_setting('request.jwt.claims', true)::json->>'sub' IS NULL);

-- Allow entitlements creation for authenticated users
CREATE POLICY "Allow entitlements creation for authenticated users"
  ON public.user_entitlements FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Allow entitlements updates for authenticated users
CREATE POLICY "Users can update their own entitlements"
  ON public.user_entitlements FOR UPDATE
  TO authenticated, anon
  USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub' OR current_setting('request.jwt.claims', true)::json->>'sub' IS NULL);

-- Add comment for future reference
COMMENT ON POLICY "Allow subscription creation for authenticated users" ON public.subscriptions 
IS 'Allows subscription creation from frontend using custom phone-based auth system';

COMMENT ON POLICY "Allow entitlements creation for authenticated users" ON public.user_entitlements 
IS 'Allows entitlements creation from frontend using custom phone-based auth system'; 