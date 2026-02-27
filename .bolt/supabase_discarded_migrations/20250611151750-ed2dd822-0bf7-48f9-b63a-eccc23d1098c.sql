
-- Clean up corrupted phone entries in profiles table
-- Remove profiles with phone numbers that are just user IDs (corrupted entries)
DELETE FROM public.profiles 
WHERE phone LIKE '+91%-%-%-%-%' 
   OR length(phone) > 20 
   OR phone ~ '^[+]91[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$';

-- Update any remaining profiles that might have malformed phone numbers
-- This will help ensure all phone numbers are in the correct format
UPDATE public.profiles 
SET phone = '+91' || regexp_replace(phone, '[^0-9]', '', 'g')
WHERE phone IS NOT NULL 
  AND phone NOT LIKE '+91%'
  AND length(regexp_replace(phone, '[^0-9]', '', 'g')) = 10;

-- Ensure all valid phone numbers start with +91
UPDATE public.profiles 
SET phone = '+91' || phone
WHERE phone IS NOT NULL 
  AND phone ~ '^[0-9]{10}$';

-- Remove any profiles that still have invalid phone numbers after cleanup
DELETE FROM public.profiles 
WHERE phone IS NOT NULL 
  AND (length(phone) != 13 OR phone !~ '^\+91[0-9]{10}$');
