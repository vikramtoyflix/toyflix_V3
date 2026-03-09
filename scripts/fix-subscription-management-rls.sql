-- Fix Subscription Management RLS Issue
-- This script temporarily disables RLS to allow insertions, then creates proper policies

-- Step 1: Temporarily disable RLS to allow insertions
ALTER TABLE subscription_management DISABLE ROW LEVEL SECURITY;

-- Step 2: Create proper RLS policy for authenticated users
CREATE POLICY "subscription_management_insert_policy" ON subscription_management
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscription_management_select_policy" ON subscription_management
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "subscription_management_update_policy" ON subscription_management
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscription_management_delete_policy" ON subscription_management
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Step 3: Re-enable RLS with proper policies
ALTER TABLE subscription_management ENABLE ROW LEVEL SECURITY;

-- Step 4: Grant necessary permissions
GRANT ALL ON subscription_management TO authenticated;
GRANT ALL ON subscriptions TO authenticated;

-- Verification query
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'subscription_management';