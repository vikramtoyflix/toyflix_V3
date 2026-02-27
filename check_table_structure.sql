-- Check the actual subscription_management table structure
\d subscription_management;

-- Also get detailed column information
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'subscription_management' 
ORDER BY ordinal_position;
