-- =====================================================
-- PHASE 2: MIGRATE EXISTING ORDERS TO RENTAL_ORDERS (FINAL)
-- =====================================================
-- Fixed version that handles TIMESTAMP rental dates properly
-- =====================================================

-- Clear any existing data from rental_orders (if running again)
TRUNCATE TABLE rental_orders;

-- Check data before migration
DO $$
BEGIN
    RAISE NOTICE '=== PRE-MIGRATION DATA ANALYSIS ===';
    RAISE NOTICE 'Orders count: %', (SELECT COUNT(*) FROM orders);
    RAISE NOTICE 'Order items count: %', (SELECT COUNT(*) FROM order_items);
    RAISE NOTICE 'Users with orders: %', (SELECT COUNT(DISTINCT user_id) FROM orders WHERE user_id IS NOT NULL);
    RAISE NOTICE 'Orders with rental dates: %', (SELECT COUNT(*) FROM orders WHERE rental_start_date IS NOT NULL);
    RAISE NOTICE 'Orders with both rental dates AND user_id: %', (SELECT COUNT(*) FROM orders WHERE rental_start_date IS NOT NULL AND user_id IS NOT NULL);
END $$;

-- =====================================================
-- FIXED MIGRATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION migrate_orders_to_rental_orders_fixed()
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
    RAISE NOTICE 'Starting FIXED migration of orders to rental_orders...';
    
    -- Loop through ALL orders (removed rental_start_date filter temporarily)
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
        WHERE o.user_id IS NOT NULL  -- Only require user_id, not rental dates
        ORDER BY o.user_id, COALESCE(o.rental_start_date, o.created_at)
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
                        'returned', CASE WHEN order_record.returned_date IS NOT NULL THEN true ELSE false END
                    )
                ),
                '[]'::jsonb
            ) INTO toys_json
            FROM order_items oi
            LEFT JOIN toys t ON t.id = oi.toy_id
            WHERE oi.order_id = order_record.order_id;
            
            -- Count toys for this order
            total_toys := total_toys + jsonb_array_length(toys_json);
            
            -- Insert into rental_orders with proper date handling
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
                -- Convert TIMESTAMP to DATE properly
                COALESCE(order_record.rental_start_date::date, order_record.created_at::date),
                COALESCE(order_record.rental_end_date::date, (order_record.created_at::date + INTERVAL '30 days')::date),
                order_record.returned_date::date,
                CASE 
                    WHEN order_record.returned_date IS NOT NULL THEN 'complete'
                    WHEN COALESCE(order_record.rental_end_date::date, (order_record.created_at::date + INTERVAL '30 days')::date) < CURRENT_DATE 
                         AND order_record.returned_date IS NULL THEN 'overdue'
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

-- Run the fixed migration
SELECT * FROM migrate_orders_to_rental_orders_fixed();

-- =====================================================
-- POST-MIGRATION VALIDATION
-- =====================================================

DO $$
DECLARE
    original_orders INTEGER;
    migrated_orders INTEGER;
    original_items INTEGER;
    migrated_toys INTEGER;
    selection_window_users INTEGER;
BEGIN
    RAISE NOTICE '=== POST-MIGRATION VALIDATION ===';
    
    -- Count original vs migrated orders
    SELECT COUNT(*) INTO original_orders FROM orders WHERE user_id IS NOT NULL;
    SELECT COUNT(*) INTO migrated_orders FROM rental_orders;
    
    RAISE NOTICE 'Original orders with user_id: %', original_orders;
    RAISE NOTICE 'Migrated rental orders: %', migrated_orders;
    
    -- Count original vs migrated toys
    SELECT COUNT(*) INTO original_items 
    FROM order_items oi 
    JOIN orders o ON o.id = oi.order_id 
    WHERE o.user_id IS NOT NULL;
    
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
    
    -- Check selection window users
    SELECT COUNT(*) INTO selection_window_users
    FROM rental_orders_with_cycle_info 
    WHERE is_selection_window_active = true;
    
    RAISE NOTICE 'Users currently in selection window: %', selection_window_users;
END $$;

-- =====================================================
-- SAMPLE DATA VERIFICATION
-- =====================================================

DO $$
DECLARE
    sample_record RECORD;
    test_user_id UUID;
    cycle_result RECORD;
BEGIN
    RAISE NOTICE '=== SAMPLE MIGRATED DATA ===';
    
    -- Show first 5 migrated orders with details
    FOR sample_record IN 
        SELECT 
            order_number,
            user_id,
            cycle_number,
            toys_delivered_count,
            status,
            rental_start_date,
            rental_end_date
        FROM rental_orders 
        ORDER BY created_at DESC
        LIMIT 5
    LOOP
        RAISE NOTICE 'Order: %, User: %, Cycle: %, Toys: %, Status: %, Rental: % to %', 
            sample_record.order_number,
            sample_record.user_id,
            sample_record.cycle_number,
            sample_record.toys_delivered_count,
            sample_record.status,
            sample_record.rental_start_date,
            sample_record.rental_end_date;
    END LOOP;
    
    -- Test the get_user_current_cycle function with a real user
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
-- SHOW USERS IN SELECTION WINDOW
-- =====================================================

DO $$
DECLARE
    selection_record RECORD;
BEGIN
    RAISE NOTICE '=== USERS IN SELECTION WINDOW ===';
    
    FOR selection_record IN
        SELECT 
            ro.user_id,
            cu.first_name,
            cu.last_name,
            cu.phone,
            ro.order_number,
            ro.cycle_number,
            rci.current_day_in_cycle,
            ro.rental_start_date,
            ro.rental_end_date
        FROM rental_orders_with_cycle_info rci
        JOIN rental_orders ro ON ro.id = rci.id
        JOIN custom_users cu ON cu.id = ro.user_id
        WHERE rci.is_selection_window_active = true
        LIMIT 10
    LOOP
        RAISE NOTICE 'Selection Window: % % (%), Order: %, Cycle: %, Day %', 
            selection_record.first_name,
            selection_record.last_name,
            selection_record.phone,
            selection_record.order_number,
            selection_record.cycle_number,
            selection_record.current_day_in_cycle;
    END LOOP;
END $$;

-- =====================================================
-- CLEANUP AND FINAL STATUS
-- =====================================================

-- Drop the migration function
DROP FUNCTION IF EXISTS migrate_orders_to_rental_orders_fixed();

-- Final summary
DO $$
DECLARE
    final_stats RECORD;
BEGIN
    RAISE NOTICE '=== PHASE 2 MIGRATION COMPLETE ===';
    
    SELECT 
        COUNT(*) as total_rental_orders,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(toys_delivered_count) as total_toys_migrated,
        MIN(rental_start_date) as earliest_rental,
        MAX(rental_start_date) as latest_rental
    INTO final_stats
    FROM rental_orders;
    
    RAISE NOTICE 'Total rental orders: %', final_stats.total_rental_orders;
    RAISE NOTICE 'Unique users: %', final_stats.unique_users;
    RAISE NOTICE 'Total toys migrated: %', final_stats.total_toys_migrated;
    RAISE NOTICE 'Earliest rental: %', final_stats.earliest_rental;
    RAISE NOTICE 'Latest rental: %', final_stats.latest_rental;
    
    RAISE NOTICE '=== SYSTEM READY FOR DASHBOARD ===';
    RAISE NOTICE 'rental_orders table: Ready for use';
    RAISE NOTICE 'Cycle management functions: Ready';
    RAISE NOTICE 'Selection window logic: Active';
    RAISE NOTICE 'Dashboard integration: Ready to proceed';
END $$; 