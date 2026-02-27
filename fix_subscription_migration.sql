-- Fixed migration script with all required fields

-- First, let's see what columns are required in subscription_management
SELECT column_name, is_nullable, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'subscription_management' 
AND is_nullable = 'NO'
ORDER BY ordinal_position;
