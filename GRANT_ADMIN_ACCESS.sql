-- GRANT ADMIN ACCESS: Run this in your Supabase SQL Editor
-- This will grant admin privileges to phone number 8595968253

-- Step 1: Update user role to admin for your phone number
UPDATE public.custom_users 
SET role = 'admin'
WHERE phone = '8595968253' OR phone = '+918595968253';

-- Step 2: Also update admin_users_view table if it exists
UPDATE public.admin_users_view 
SET role = 'admin'
WHERE phone = '8595968253' OR phone = '+918595968253';

-- Step 3: Verify the update worked
SELECT id, phone, email, first_name, last_name, role, is_active 
FROM public.custom_users 
WHERE phone = '8595968253' OR phone = '+918595968253';

-- Done! You now have admin access. Log out and log back in to see admin panel. 