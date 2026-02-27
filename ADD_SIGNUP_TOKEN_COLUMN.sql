-- Add signup_token column to custom_users table for mobile app compatibility
-- This enables the WordPress-style token authentication for mobile apps

-- Add the signup_token column if it doesn't exist
ALTER TABLE public.custom_users 
ADD COLUMN IF NOT EXISTS signup_token TEXT;

-- Add FCM token column for mobile notifications if it doesn't exist  
ALTER TABLE public.custom_users 
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_custom_users_signup_token ON public.custom_users(signup_token);
CREATE INDEX IF NOT EXISTS idx_custom_users_fcm_token ON public.custom_users(fcm_token);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'custom_users' 
AND column_name IN ('signup_token', 'fcm_token')
ORDER BY column_name;
