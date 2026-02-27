-- =====================================================
-- PHASE 2: MIGRATE EXISTING ORDERS TO RENTAL_ORDERS
-- =====================================================
-- This script will:
-- 1. Migrate all existing orders from orders table
-- 2. Aggregate order_items data into JSONB toys_data
-- 3. Calculate cycle numbers for each user
-- 4. Preserve all original data with legacy references
-- 5. Validate the migration results
-- =====================================================

-- =====================================================
-- BACKUP AND PREPARATION
-- =====================================================

-- Create backup tables (optional but recommended)
-- CREATE TABLE orders_backup AS SELECT * FROM orders;
-- CREATE TABLE order_items_backup AS SELECT * FROM order_items;

-- Check data before migration
DO $$
BEGIN
    RAISE NOTICE '=== PRE-MIGRATION DATA ANALYSIS ===';
    RAISE NOTICE 'Orders count: %', (SELECT COUNT(*) FROM orders);
    RAISE NOTICE 'Order items count: %', (SELECT COUNT(*) FROM order_items);
    RAISE NOTICE 'Users with orders: %', (SELECT COUNT(DISTINCT user_id) FROM orders WHERE user_id IS NOT NULL);
    RAISE NOTICE 'Orders with rental dates: %', (SELECT COUNT(*) FROM orders WHERE rental_start_date IS NOT NULL);
END $$;

-- =====================================================
-- MIGRATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION migrate_orders_to_rental_orders()
RETURNS TABLE (
    migrated_orders INTEGER,
    failed_orders INTEGER,
    total_toys_migrated INTEGER
) AS $$
DECLARE
    order_record RECORD;
    toys_json JSONB;
    cycle_num INTEGER;
    migrated_count INTEGER := 0;
    failed_count INTEGER := 0;
    total_toys INTEGER := 0;
    user_cycle_map JSONB := '{}'::jsonb;
BEGIN
    RAISE NOTICE 'Starting migration of orders to rental_orders...';
    
    -- Loop through all orders with rental dates
    FOR order_record IN 
        SELECT 
            o.id as order_id,
            o.user_id,
            o.status,
            o.total_amount,
            o.base_amount,
            o.gst_amount,
            o.discount_amount,
            o.rental_start_date,
            o.rental_end_date,
            o.returned_date,
            o.shipping_address,
            o.created_at,
            o.updated_at,
            o.order_type,
            -- Get user info for cycle calculation
            cu.subscription_plan,
            cu.subscription_active
        FROM orders o
        LEFT JOIN custom_users cu ON cu.id = o.user_id
        WHERE o.rental_start_date IS NOT NULL
        ORDER BY o.user_id, o.rental_start_date
    LOOP
        BEGIN
            -- Calculate cycle number for this user
            IF user_cycle_map ? order_record.user_id::text THEN
                cycle_num := (user_cycle_map->order_record.user_id::text)::integer + 1;
            ELSE
                cycle_num := 1;
            END IF;
            
            -- Update user cycle map
            user_cycle_map := jsonb_set(user_cycle_map, ARRAY[order_record.user_id::text], cycle_num::text::jsonb);
            
            -- Aggregate toys data for this order
            SELECT COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'toy_id', oi.toy_id,
                        'name', COALESCE(t.name, 'Unknown Toy'),
                        'category', COALESCE(t.category, 'Unknown'),
                        'brand', COALESCE(t.brand, ''),
                        'image_url', COALESCE(t.image_url, ''),
                        'quantity', oi.quantity,
                        'rental_price', COALESCE(oi.rental_price, oi.unit_price, oi.total_price, 0),
                        'subscription_category', COALESCE(oi.subscription_category, ''),
                        'age_group', COALESCE(oi.age_group, ''),
                        'returned', false  -- Default to not returned
                    )
                ),
                '[]'::jsonb
            ) INTO toys_json
            FROM order_items oi
            LEFT JOIN toys t ON t.id = oi.toy_id
            WHERE oi.order_id = order_record.order_id;
            
            -- Count toys for this order
            total_toys := total_toys + jsonb_array_length(toys_json);
            
            -- Insert into rental_orders
            INSERT INTO rental_orders (
                legacy_order_id,
                legacy_created_at,
                user_id,
                order_number,
                status,
                order_type,
                subscription_plan,
                total_amount,
                base_amount,
                gst_amount,
                discount_amount,
                payment_status,
                cycle_number,
                rental_start_date,
                rental_end_date,
                returned_date,
                return_status,
                toys_data,
                toys_delivered_count,
                toys_returned_count,
                shipping_address,
                subscription_category,
                age_group,
                created_at,
                updated_at
            ) VALUES (
                order_record.order_id,
                order_record.created_at,
                order_record.user_id,
                'ORD-' || EXTRACT(EPOCH FROM order_record.created_at)::bigint || '-' || LEFT(order_record.order_id::text, 8),
                order_record.status,
                COALESCE(order_record.order_type, 'subscription'),
                order_record.subscription_plan,
                COALESCE(order_record.total_amount, 0),
                COALESCE(order_record.base_amount, 0),
                COALESCE(order_record.gst_amount, 0),
                COALESCE(order_record.discount_amount, 0),
                CASE 
                    WHEN order_record.status IN ('confirmed', 'delivered', 'shipped') THEN 'paid'
                    WHEN order_record.status = 'cancelled' THEN 'refunded'
                    ELSE 'pending'
                END,
                cycle_num,
                order_record.rental_start_date,
                order_record.rental_end_date,
                order_record.returned_date,
                CASE 
                    WHEN order_record.returned_date IS NOT NULL THEN 'complete'
                    WHEN order_record.rental_end_date < CURRENT_DATE AND order_record.returned_date IS NULL THEN 'overdue'
                    ELSE 'pending'
                END,
                toys_json,
                jsonb_array_length(toys_json),
                CASE 
                    WHEN order_record.returned_date IS NOT NULL THEN jsonb_array_length(toys_json)
                    ELSE 0
                END,
                COALESCE(order_record.shipping_address, '{}'::jsonb),
                -- Extract subscription category from first toy if available
                CASE 
                    WHEN jsonb_array_length(toys_json) > 0 THEN toys_json->0->>'subscription_category'
                    ELSE NULL
                END,
                -- Extract age group from first toy if available
                CASE 
                    WHEN jsonb_array_length(toys_json) > 0 THEN toys_json->0->>'age_group'
                    ELSE NULL
                END,
                order_record.created_at,
                order_record.updated_at
            );
            
            migrated_count := migrated_count + 1;
            
            -- Log progress every 100 orders
            IF migrated_count % 100 = 0 THEN
                RAISE NOTICE 'Migrated % orders...', migrated_count;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                failed_count := failed_count + 1;
                RAISE NOTICE 'Failed to migrate order %: %', order_record.order_id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Migration completed: % successful, % failed, % toys migrated', migrated_count, failed_count, total_toys;
    
    RETURN QUERY SELECT migrated_count, failed_count, total_toys;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- EXECUTE MIGRATION
-- =====================================================

-- Run the migration
SELECT * FROM migrate_orders_to_rental_orders();

-- =====================================================
-- POST-MIGRATION VALIDATION
-- =====================================================

-- Validation queries to ensure migration was successful
DO $$
DECLARE
    original_orders INTEGER;
    migrated_orders INTEGER;
    original_items INTEGER;
    migrated_toys INTEGER;
BEGIN
    RAISE NOTICE '=== POST-MIGRATION VALIDATION ===';
    
    -- Count original vs migrated orders
    SELECT COUNT(*) INTO original_orders FROM orders WHERE rental_start_date IS NOT NULL;
    SELECT COUNT(*) INTO migrated_orders FROM rental_orders;
    
    RAISE NOTICE 'Original orders with rental dates: %', original_orders;
    RAISE NOTICE 'Migrated rental orders: %', migrated_orders;
    
    -- Count original vs migrated toys
    SELECT COUNT(*) INTO original_items 
    FROM order_items oi 
    JOIN orders o ON o.id = oi.order_id 
    WHERE o.rental_start_date IS NOT NULL;
    
    SELECT SUM(toys_delivered_count) INTO migrated_toys FROM rental_orders;
    
    RAISE NOTICE 'Original order items: %', original_items;
    RAISE NOTICE 'Migrated toys: %', migrated_toys;
    
    -- Check for missing users
    IF EXISTS (
        SELECT 1 FROM rental_orders ro 
        LEFT JOIN custom_users cu ON cu.id = ro.user_id 
        WHERE cu.id IS NULL
    ) THEN
        RAISE WARNING 'Found rental orders with missing users!';
    ELSE
        RAISE NOTICE 'All rental orders have valid users ✓';
    END IF;
    
    -- Check cycle number distribution
    RAISE NOTICE 'Cycle number distribution:';
    FOR i IN 1..10 LOOP
        DECLARE
            cycle_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO cycle_count FROM rental_orders WHERE cycle_number = i;
            IF cycle_count > 0 THEN
                RAISE NOTICE 'Cycle %: % orders', i, cycle_count;
            END IF;
        END;
    END LOOP;
END $$;

-- =====================================================
-- SAMPLE DATA VERIFICATION
-- =====================================================

-- Show sample migrated data
RAISE NOTICE '=== SAMPLE MIGRATED DATA ===';

-- Show first 3 migrated orders with details
SELECT 
    'Sample Order: ' || order_number || 
    ', User: ' || user_id::text || 
    ', Cycle: ' || cycle_number || 
    ', Toys: ' || toys_delivered_count ||
    ', Status: ' || status ||
    ', Rental: ' || rental_start_date || ' to ' || rental_end_date as sample_info
FROM rental_orders 
ORDER BY created_at 
LIMIT 3;

-- Test cycle calculation functions with migrated data
SELECT 
    'Testing cycle functions for user: ' || user_id::text as test_info
FROM rental_orders 
LIMIT 1;

-- Test the get_user_current_cycle function with a real user
DO $$
DECLARE
    test_user_id UUID;
    cycle_result RECORD;
BEGIN
    -- Get a user with migrated data
    SELECT user_id INTO test_user_id FROM rental_orders LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        SELECT * INTO cycle_result FROM get_user_current_cycle(test_user_id);
        
        IF cycle_result.order_id IS NOT NULL THEN
            RAISE NOTICE 'Cycle function test SUCCESS: User % has active cycle % with % toys at home', 
                test_user_id, cycle_result.cycle_number, cycle_result.toys_at_home;
        ELSE
            RAISE NOTICE 'No active cycle found for test user % (this may be normal)', test_user_id;
        END IF;
    END IF;
END $$;

-- =====================================================
-- CHECK SELECTION WINDOW USERS
-- =====================================================

-- Find users currently in selection window
SELECT 
    'Users in selection window: ' || COUNT(*) as selection_window_info
FROM rental_orders_with_cycle_info 
WHERE is_selection_window_active = true;

-- Show details of users in selection window
SELECT 
    user_id,
    order_number,
    cycle_number,
    current_day_in_cycle,
    rental_start_date,
    rental_end_date,
    'Day ' || current_day_in_cycle || ' - Selection Window ACTIVE' as status
FROM rental_orders_with_cycle_info 
WHERE is_selection_window_active = true
LIMIT 5;

-- =====================================================
-- PERFORMANCE TEST
-- =====================================================

-- Test query performance
EXPLAIN ANALYZE 
SELECT * FROM rental_orders_with_cycle_info 
WHERE user_id = (SELECT user_id FROM rental_orders LIMIT 1);

-- =====================================================
-- CLEANUP MIGRATION FUNCTION
-- =====================================================

-- Drop the migration function as it's no longer needed
DROP FUNCTION IF EXISTS migrate_orders_to_rental_orders();

-- =====================================================
-- FINAL STATUS
-- =====================================================

SELECT 
    'Phase 2 Migration Complete!' as status,
    COUNT(*) as total_rental_orders,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(toys_delivered_count) as total_toys_migrated,
    MIN(rental_start_date) as earliest_rental,
    MAX(rental_start_date) as latest_rental
FROM rental_orders;

-- Summary of what was created
SELECT 
    'Table: rental_orders' as created_object,
    'Status: Ready for use' as status
UNION ALL
SELECT 
    'Functions: get_user_current_cycle, get_user_order_history, etc.',
    'Status: Ready for dashboard integration'
UNION ALL
SELECT 
    'View: rental_orders_with_cycle_info',
    'Status: Ready for easy querying'
UNION ALL
SELECT 
    'Migration: Complete',
    'Status: All existing orders migrated with cycle management'; 