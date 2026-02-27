-- Verify Staging Tables
-- Run this in Supabase SQL Editor to verify staging tables are working

-- Check if schema exists
SELECT 'migration_staging schema exists' as status
WHERE EXISTS (
  SELECT 1 FROM information_schema.schemata 
  WHERE schema_name = 'migration_staging'
);

-- List all staging tables
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_schema = 'migration_staging' 
        AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'migration_staging'
ORDER BY table_name;

-- Test inserting a sample user
INSERT INTO migration_staging.users_staging 
(wp_user_id, phone, first_name, last_name, migration_batch, migration_status)
VALUES (99999, '9999999999', 'Test', 'User', 'test_batch', 'pending')
ON CONFLICT (wp_user_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  updated_at = NOW();

-- Check if the test user was inserted
SELECT wp_user_id, phone, first_name, last_name, migration_status, created_at
FROM migration_staging.users_staging 
WHERE wp_user_id = 99999;

-- Test inserting a product mapping
INSERT INTO migration_staging.product_toy_mapping 
(wp_product_id, wp_product_name, mapping_status)
VALUES (99999, 'Test Product', 'pending')
ON CONFLICT (wp_product_id) DO UPDATE SET
  wp_product_name = EXCLUDED.wp_product_name,
  updated_at = NOW();

-- Check product mapping
SELECT wp_product_id, wp_product_name, mapping_status, created_at
FROM migration_staging.product_toy_mapping 
WHERE wp_product_id = 99999;

-- Clean up test data
DELETE FROM migration_staging.users_staging WHERE wp_user_id = 99999;
DELETE FROM migration_staging.product_toy_mapping WHERE wp_product_id = 99999;

SELECT 'Staging tables verification completed successfully!' as result; 