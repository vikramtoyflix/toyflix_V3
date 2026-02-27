-- ========================================
-- BULK CLOSE SELECTION WINDOWS FUNCTIONALITY
-- Provides functions to close all manually opened selection windows
-- ========================================

-- Create function to close all manually opened selection windows
CREATE OR REPLACE FUNCTION close_all_manual_selection_windows(
    p_admin_user_id UUID,
    p_reason TEXT DEFAULT 'Bulk closure of all manually opened selection windows'
)
RETURNS TABLE (
    closed_count INTEGER,
    affected_users UUID[],
    details JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_affected_orders UUID[];
    v_affected_users UUID[];
    v_closed_count INTEGER := 0;
    v_order_record RECORD;
    v_details JSONB := '[]'::jsonb;
BEGIN
    -- Find all rental orders with manually opened selection windows
    FOR v_order_record IN
        SELECT 
            id,
            user_id,
            order_number,
            selection_window_status,
            manual_selection_control,
            selection_window_opened_at
        FROM public.rental_orders
        WHERE subscription_status = 'active'
        AND selection_window_status = 'manual_open'
        AND manual_selection_control = true
    LOOP
        -- Close the selection window
        UPDATE public.rental_orders
        SET 
            selection_window_status = 'manual_closed',
            selection_window_closed_at = NOW(),
            selection_window_notes = COALESCE(
                selection_window_notes || E'\n', 
                ''
            ) || p_reason || ' (Admin: ' || p_admin_user_id::text || ')',
            updated_at = NOW(),
            updated_by = p_admin_user_id
        WHERE id = v_order_record.id;
        
        -- Track the closure
        v_closed_count := v_closed_count + 1;
        v_affected_orders := array_append(v_affected_orders, v_order_record.id);
        v_affected_users := array_append(v_affected_users, v_order_record.user_id);
        
        -- Add to details
        v_details := v_details || jsonb_build_object(
            'rental_order_id', v_order_record.id,
            'user_id', v_order_record.user_id,
            'order_number', v_order_record.order_number,
            'was_opened_at', v_order_record.selection_window_opened_at,
            'closed_at', NOW()
        );
        
        -- Log the action in audit_log if the table exists
        BEGIN
            INSERT INTO public.audit_log (
                table_name,
                record_id,
                action,
                old_values,
                new_values,
                changed_by,
                changed_at
            ) VALUES (
                'rental_orders',
                v_order_record.id,
                'selection_window_bulk_close',
                jsonb_build_object(
                    'selection_window_status', v_order_record.selection_window_status,
                    'manual_selection_control', v_order_record.manual_selection_control
                ),
                jsonb_build_object(
                    'selection_window_status', 'manual_closed',
                    'manual_selection_control', true,
                    'bulk_action', true,
                    'reason', p_reason
                ),
                p_admin_user_id,
                NOW()
            );
        EXCEPTION
            WHEN OTHERS THEN
                -- Ignore audit log errors to prevent blocking the main operation
                NULL;
        END;
    END LOOP;
    
    -- Return results
    RETURN QUERY SELECT 
        v_closed_count,
        v_affected_users,
        v_details;
        
    RAISE NOTICE 'Bulk closed % selection windows for % users', v_closed_count, array_length(v_affected_users, 1);
END;
$$;

-- Create function to get count of manually opened selection windows
CREATE OR REPLACE FUNCTION get_manual_selection_windows_count()
RETURNS TABLE (
    total_manual_open INTEGER,
    user_details JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
    v_details JSONB;
BEGIN
    -- Count manually opened selection windows
    SELECT COUNT(*)
    INTO v_count
    FROM public.rental_orders ro
    WHERE ro.subscription_status = 'active'
    AND ro.selection_window_status = 'manual_open'
    AND ro.manual_selection_control = true;
    
    -- Get user details for manually opened windows
    SELECT jsonb_agg(
        jsonb_build_object(
            'rental_order_id', ro.id,
            'user_id', ro.user_id,
            'user_name', CONCAT(COALESCE(cu.first_name, ''), ' ', COALESCE(cu.last_name, '')),
            'user_phone', cu.phone,
            'order_number', ro.order_number,
            'opened_at', ro.selection_window_opened_at,
            'cycle_day', EXTRACT(DAY FROM (CURRENT_DATE - ro.rental_start_date)) + 1,
            'subscription_plan', ro.subscription_plan
        )
    )
    INTO v_details
    FROM public.rental_orders ro
    JOIN public.custom_users cu ON ro.user_id = cu.id
    WHERE ro.subscription_status = 'active'
    AND ro.selection_window_status = 'manual_open'
    AND ro.manual_selection_control = true;
    
    -- Return results
    RETURN QUERY SELECT 
        v_count,
        COALESCE(v_details, '[]'::jsonb);
END;
$$;

-- Create function to close selection window for specific rental order (enhanced version)
CREATE OR REPLACE FUNCTION close_selection_window_by_rental_order(
    p_rental_order_id UUID,
    p_admin_user_id UUID,
    p_reason TEXT DEFAULT 'Manual closure from admin panel'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_rental_order RECORD;
    v_updated_count INTEGER;
BEGIN
    -- Get rental order details
    SELECT * INTO v_rental_order
    FROM public.rental_orders 
    WHERE id = p_rental_order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rental order not found: %', p_rental_order_id;
    END IF;
    
    -- Check if selection window is currently open
    IF v_rental_order.selection_window_status NOT IN ('manual_open', 'auto_open', 'auto') THEN
        RAISE NOTICE 'Selection window already closed for rental order %', p_rental_order_id;
        RETURN TRUE; -- Already closed
    END IF;
    
    -- Close the selection window
    UPDATE public.rental_orders
    SET 
        selection_window_status = 'manual_closed',
        manual_selection_control = true,
        selection_window_closed_at = NOW(),
        selection_window_notes = COALESCE(
            selection_window_notes || E'\n', 
            ''
        ) || p_reason,
        updated_at = NOW(),
        updated_by = p_admin_user_id
    WHERE id = p_rental_order_id;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    IF v_updated_count > 0 THEN
        -- Log the action
        BEGIN
            INSERT INTO public.audit_log (
                table_name,
                record_id,
                action,
                old_values,
                new_values,
                changed_by,
                changed_at
            ) VALUES (
                'rental_orders',
                p_rental_order_id,
                'selection_window_manual_close',
                jsonb_build_object(
                    'selection_window_status', v_rental_order.selection_window_status,
                    'manual_selection_control', v_rental_order.manual_selection_control
                ),
                jsonb_build_object(
                    'selection_window_status', 'manual_closed',
                    'manual_selection_control', true,
                    'reason', p_reason
                ),
                p_admin_user_id,
                NOW()
            );
        EXCEPTION
            WHEN OTHERS THEN
                -- Ignore audit log errors
                NULL;
        END;
        
        RAISE NOTICE 'Selection window closed for rental order % (user: %)', p_rental_order_id, v_rental_order.user_id;
        RETURN TRUE;
    ELSE
        RAISE WARNING 'Failed to close selection window for rental order %', p_rental_order_id;
        RETURN FALSE;
    END IF;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION close_all_manual_selection_windows(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_manual_selection_windows_count() TO authenticated;
GRANT EXECUTE ON FUNCTION close_selection_window_by_rental_order(UUID, UUID, TEXT) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION close_all_manual_selection_windows(UUID, TEXT) IS 'Bulk close all manually opened selection windows with audit logging';
COMMENT ON FUNCTION get_manual_selection_windows_count() IS 'Get count and details of manually opened selection windows';
COMMENT ON FUNCTION close_selection_window_by_rental_order(UUID, UUID, TEXT) IS 'Close selection window for specific rental order with enhanced logging';

-- Final validation
DO $$
BEGIN
    -- Check if the functions were created successfully
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'close_all_manual_selection_windows'
    ) THEN
        RAISE EXCEPTION 'close_all_manual_selection_windows function was not created successfully';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'get_manual_selection_windows_count'
    ) THEN
        RAISE EXCEPTION 'get_manual_selection_windows_count function was not created successfully';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'close_selection_window_by_rental_order'
    ) THEN
        RAISE EXCEPTION 'close_selection_window_by_rental_order function was not created successfully';
    END IF;
    
    RAISE NOTICE 'Bulk close selection windows system added successfully';
END $$;
